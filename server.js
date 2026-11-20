import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {assertProductionConfig,allowedOrigins,originAllowed,sessionToken} from './security.js';
import {aiMode,interpretWithAI} from './ai-provider.js';

assertProductionConfig(process.env);

const ROOT=path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(ROOT,'data'),{recursive:true});
const db=new Database(path.join(ROOT,'data','financas.sqlite'));
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,monthly_income_cents INTEGER DEFAULT 0,theme TEXT DEFAULT 'auto',onboarded INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS transactions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,type TEXT NOT NULL CHECK(type IN ('income','expense')),amount_cents INTEGER NOT NULL CHECK(amount_cents>0),category TEXT NOT NULL,description TEXT NOT NULL,date TEXT NOT NULL,source TEXT DEFAULT 'manual',created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS tx_user_date ON transactions(user_id,date);
CREATE TABLE IF NOT EXISTS goals(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,target_cents INTEGER NOT NULL CHECK(target_cents>0),saved_cents INTEGER NOT NULL DEFAULT 0 CHECK(saved_cents>=0),deadline TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS goal_contributions(id TEXT PRIMARY KEY,goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,amount_cents INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pending_actions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
`);
const app=express(); app.disable('x-powered-by');
const aiRateLimit=rateLimit({windowMs:15*60*1000,limit:25,standardHeaders:'draft-8',legacyHeaders:false});
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","https://fonts.googleapis.com"],fontSrc:["'self'","https://fonts.gstatic.com"],imgSrc:["'self'","data:"],connectSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
app.use(express.json({limit:'35kb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:500,standardHeaders:'draft-8',legacyHeaders:false}));
const authLimit=rateLimit({windowMs:15*60*1000,limit:25,standardHeaders:'draft-8',legacyHeaders:false});
const uid=()=>crypto.randomUUID(); const now=()=>new Date().toISOString();
const fail=(msg,code=400)=>{const e=new Error(msg);e.status=code;throw e;};
const money=(n)=>{let v=Number(n); if(!Number.isFinite(v)||v<=0||v>100000000)fail('Informe um valor válido maior que zero.'); return Math.round(v*100);};
const text=(v,max=160)=>String(v??'').trim().slice(0,max);
const dateValid=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!Number.isNaN(new Date(String(v)+'T12:00:00Z').valueOf())&&new Date(String(v)+'T12:00:00Z').toISOString().slice(0,10)===v;
const isoDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Recife'});
function checkOrigin(req,res,next){
  const accepted=originAllowed({
    origin:req.get('origin'),fetchSite:req.get('sec-fetch-site'),
    method:req.method,contentType:req.get('content-type')
  },allowedOrigins(process.env));
  if(!accepted)return res.status(403).json({error:'Requisição bloqueada por política de origem ou tipo de conteúdo.'});
  next();
}
app.use('/api',checkOrigin);
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s).slice(0,2)).filter(p=>p.length===2));}
function authorize(req,res,next){const token=cookies(req).fa_session;if(!token)return res.status(401).json({error:'Faça login para continuar.'});const s=db.prepare('SELECT user_id FROM sessions WHERE id=? AND expires_at>?').get(token,Date.now());if(!s)return res.status(401).json({error:'Sessão expirada.'});req.userId=s.user_id;req.sessionId=token;next();}
function cookie(res,value,maxAge){res.cookie('fa_session',value,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge});}
function txPublic(t){return {...t,amount:t.amount_cents/100};}
function goalPublic(g){return {...g,target:g.target_cents/100,saved:g.saved_cents/100};}
function saveMessage(u,role,content){db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(uid(),u,role,content,now());}
const getTransactions=(u)=>db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY date DESC,created_at DESC').all(u);
function summary(u,month){let all=getTransactions(u);const monthly=all.filter(t=>t.date.startsWith(month));const inc=monthly.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount_cents,0);const exp=monthly.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount_cents,0);const balance=all.reduce((a,t)=>a+(t.type==='income'?t.amount_cents:-t.amount_cents),0);const categories={};monthly.filter(t=>t.type==='expense').forEach(t=>categories[t.category]=(categories[t.category]||0)+t.amount_cents);return {income:inc/100,expenses:exp/100,balance:balance/100,available:(inc-exp)/100,categories:Object.entries(categories).map(([name,cents])=>({name,value:cents/100})).sort((a,b)=>b.value-a.value),count:monthly.length};}
function validateTx(body){const type=body.type;if(!['income','expense'].includes(type))fail('Tipo inválido.');const amount_cents=money(body.amount);const category=text(body.category,40)||'Outros';const description=text(body.description,180)||category;const date=body.date||isoDate();if(!dateValid(date))fail('Data inválida.');return {type,amount_cents,category,description,date};}
app.post('/api/auth/register',authLimit,(req,res)=>{const name=text(req.body.name,90),email=text(req.body.email,180).toLowerCase(),password=req.body.password;if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8||password.length>128)fail('Informe nome, e-mail válido e senha de 8 a 128 caracteres.');if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail('E-mail já cadastrado.',409);const id=uid(),sid=sessionToken();db.transaction(()=>{db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,name,email,bcrypt.hashSync(password,12),now());db.prepare('INSERT INTO profiles(user_id) VALUES(?)').run(id);db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(sid,id,Date.now()+7*86400000);})();cookie(res,sid,7*86400000);res.status(201).json({user:{id,name,email}});});
app.post('/api/auth/login',authLimit,(req,res)=>{const email=text(req.body.email,180).toLowerCase(),pass=req.body.password;const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);if(!u||typeof pass!=='string'||!bcrypt.compareSync(pass,u.password))fail('E-mail ou senha incorretos.',401);const sid=sessionToken();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(sid,u.id,Date.now()+7*86400000);cookie(res,sid,7*86400000);res.json({user:{id:u.id,name:u.name,email:u.email}});});
app.post('/api/auth/logout',authorize,(req,res)=>{db.prepare('DELETE FROM sessions WHERE id=?').run(req.sessionId);res.clearCookie('fa_session',{path:'/',sameSite:'strict',secure:process.env.NODE_ENV==='production'});res.json({ok:true});});
app.get('/api/me',authorize,(req,res)=>{const u=db.prepare('SELECT id,name,email,created_at FROM users WHERE id=?').get(req.userId);const p=db.prepare('SELECT * FROM profiles WHERE user_id=?').get(req.userId);res.json({...u,profile:{monthly_income:p.monthly_income_cents/100,theme:p.theme,onboarded:!!p.onboarded}});});
app.patch('/api/me',authorize,(req,res)=>{const name=text(req.body.name,90);if(name.length>=2)db.prepare('UPDATE users SET name=? WHERE id=?').run(name,req.userId);let p=db.prepare('SELECT * FROM profiles WHERE user_id=?').get(req.userId);let income=p.monthly_income_cents;if(req.body.monthly_income!==undefined){const v=Number(req.body.monthly_income);if(!Number.isFinite(v)||v<0||v>100000000)fail('Renda inválida.');income=Math.round(v*100);}const theme=['light','dark','auto'].includes(req.body.theme)?req.body.theme:p.theme;const onboarded=req.body.onboarded===undefined?p.onboarded:(req.body.onboarded?1:0);db.prepare('UPDATE profiles SET monthly_income_cents=?,theme=?,onboarded=? WHERE user_id=?').run(income,theme,onboarded,req.userId);res.json({ok:true});});
app.delete('/api/me',authorize,(req,res)=>{db.prepare('DELETE FROM users WHERE id=?').run(req.userId);res.clearCookie('fa_session',{path:'/',sameSite:'strict',secure:process.env.NODE_ENV==='production'});res.json({ok:true});});
app.get('/api/dashboard',authorize,(req,res)=>{const month=/^\d{4}-\d{2}$/.test(req.query.month)?req.query.month:isoDate().slice(0,7);res.json({...summary(req.userId,month),recent:getTransactions(req.userId).slice(0,6).map(txPublic),goals:db.prepare('SELECT * FROM goals WHERE user_id=? ORDER BY created_at DESC').all(req.userId).map(goalPublic)});});
app.get('/api/transactions',authorize,(req,res)=>{let rows=getTransactions(req.userId);if(req.query.month)rows=rows.filter(t=>t.date.startsWith(String(req.query.month)));if(['income','expense'].includes(req.query.type))rows=rows.filter(t=>t.type===req.query.type);if(req.query.category)rows=rows.filter(t=>t.category===req.query.category);if(req.query.q){const q=String(req.query.q).toLowerCase();rows=rows.filter(t=>`${t.description} ${t.category}`.toLowerCase().includes(q));}res.json(rows.slice(0,500).map(txPublic));});
app.post('/api/transactions',authorize,(req,res)=>{const t=validateTx(req.body),id=uid();db.prepare('INSERT INTO transactions VALUES(?,?,?,?,?,?,?,?,?)').run(id,req.userId,t.type,t.amount_cents,t.category,t.description,t.date,req.body.source==='chat'?'chat':'manual',now());res.status(201).json({id,...t,amount:t.amount_cents/100});});
app.patch('/api/transactions/:id',authorize,(req,res)=>{const old=db.prepare('SELECT * FROM transactions WHERE id=? AND user_id=?').get(req.params.id,req.userId);if(!old)fail('Transação não encontrada.',404);const t=validateTx({...old,amount:old.amount_cents/100,...req.body});db.prepare('UPDATE transactions SET type=?,amount_cents=?,category=?,description=?,date=? WHERE id=? AND user_id=?').run(t.type,t.amount_cents,t.category,t.description,t.date,old.id,req.userId);res.json({ok:true});});
app.delete('/api/transactions/:id',authorize,(req,res)=>{const x=db.prepare('DELETE FROM transactions WHERE id=? AND user_id=?').run(req.params.id,req.userId);if(!x.changes)fail('Transação não encontrada.',404);res.json({ok:true});});
app.get('/api/goals',authorize,(req,res)=>res.json(db.prepare('SELECT * FROM goals WHERE user_id=? ORDER BY created_at DESC').all(req.userId).map(goalPublic)));
app.post('/api/goals',authorize,(req,res)=>{const name=text(req.body.name,100),target=money(req.body.target),deadline=req.body.deadline||null;if(!name)fail('Informe um nome para a meta.');if(deadline&&!dateValid(deadline))fail('Prazo inválido.');const id=uid();db.prepare('INSERT INTO goals VALUES(?,?,?,?,?,?,?)').run(id,req.userId,name,target,0,deadline,now());res.status(201).json({id,name,target:target/100,saved:0,deadline});});
app.patch('/api/goals/:id',authorize,(req,res)=>{const g=db.prepare('SELECT * FROM goals WHERE id=? AND user_id=?').get(req.params.id,req.userId);if(!g)fail('Meta não encontrada.',404);const name=req.body.name===undefined?g.name:text(req.body.name,100),target=req.body.target===undefined?g.target_cents:money(req.body.target),deadline=req.body.deadline===undefined?g.deadline:(req.body.deadline||null);if(!name||deadline&&!dateValid(deadline))fail('Informações inválidas.');db.prepare('UPDATE goals SET name=?,target_cents=?,deadline=? WHERE id=? AND user_id=?').run(name,target,deadline,g.id,req.userId);res.json({ok:true});});
app.delete('/api/goals/:id',authorize,(req,res)=>{const x=db.prepare('DELETE FROM goals WHERE id=? AND user_id=?').run(req.params.id,req.userId);if(!x.changes)fail('Meta não encontrada.',404);res.json({ok:true});});
app.post('/api/goals/:id/contributions',authorize,(req,res)=>{const g=db.prepare('SELECT * FROM goals WHERE id=? AND user_id=?').get(req.params.id,req.userId);if(!g)fail('Meta não encontrada.',404);const amount=money(req.body.amount);db.transaction(()=>{db.prepare('UPDATE goals SET saved_cents=saved_cents+? WHERE id=?').run(amount,g.id);db.prepare('INSERT INTO goal_contributions VALUES(?,?,?,?,?)').run(uid(),g.id,req.userId,amount,now());})();res.json({ok:true});});
app.get('/api/reports',authorize,(req,res)=>{const today=isoDate(),out=[];for(let i=5;i>=0;i--){const d=new Date(today+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-i);const month=d.toISOString().slice(0,7);out.push({month,...summary(req.userId,month)});}res.json({months:out});});
const moneyBRL=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const expenseWords=['gastei','paguei','comprei','despesa','pago','gastou'];
const incomeWords=['recebi','ganhei','salário','salario','receita','vendi','entrada','depositaram'];
const classify=(s,type)=>{const x=s.toLowerCase();if(type==='income')return /sal[aá]rio|pagamento|holerite/.test(x)?'Salário':'Outras receitas';for(const [cat,pattern] of [['Alimentação',/almo[cç]o|jantar|caf[eé]|mercado|supermercado|lanche|restaurante|padaria|comida|ifood/],['Transporte',/uber|99\b|[oô]nibus|combust[ií]vel|gasolina|transporte|metr[oô]|estacionamento/],['Moradia',/aluguel|condom[ií]nio|luz|energia|[aá]gua|internet|moradia/],['Saúde',/farm[aá]cia|m[eé]dico|consulta|rem[eé]dio|sa[uú]de/],['Educação',/curso|escola|livro|faculdade|educa[cç][aã]o/],['Assinaturas',/netflix|spotify|assinatura|streaming/],['Lazer',/cinema|viagem|lazer|show|festa/],['Compras',/roupa|sapato|celular|notebook|compras/]])if(pattern.test(x))return cat;return 'Outros gastos';};
function parseMoney(s){const m=s.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)?/i);if(!m)return null;let t=m[1];if(t.includes(',')&&t.includes('.'))t=t.replaceAll('.','').replace(',','.');else if(t.includes(','))t=t.replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replaceAll('.','');return Number(t);}
function parseChat(input,u){const msg=input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const month=isoDate().slice(0,7);const s=summary(u,month);if(/(quanto|total|resumo|saldo|gastos|despesas|receitas|economiz)/.test(msg)&&!/(gastei|paguei|recebi|ganhei|comprei)/.test(msg)){if(/saldo/.test(msg))return {reply:`Seu saldo acumulado registrado é ${moneyBRL(s.balance)}.`,intent:'query'};const cat=Object.entries({alimentacao:'Alimentação',transporte:'Transporte',moradia:'Moradia',saude:'Saúde',educacao:'Educação',lazer:'Lazer',compras:'Compras',assinaturas:'Assinaturas'}).find(([k])=>msg.includes(k));if(cat){const value=s.categories.find(c=>c.name===cat[1])?.value||0;return {reply:`Neste mês você registrou ${moneyBRL(value)} em ${cat[1]}.`,intent:'query'};}return {reply:`Neste mês: receitas ${moneyBRL(s.income)}, despesas ${moneyBRL(s.expenses)} e resultado ${moneyBRL(s.available)}.`,intent:'query'};}
if(/(dica|sugest|ajud|economizar)/.test(msg)&&!/(gastei|paguei|recebi)/.test(msg)){const top=s.categories[0];return {reply:top?`Sua maior categoria de despesas neste mês é ${top.name} (${moneyBRL(top.value)}). Confira os lançamentos dessa categoria e identifique gastos que podem ser reduzidos.`:'Comece registrando receitas e despesas. Com alguns lançamentos, consigo mostrar quais categorias pesam mais no seu orçamento.',intent:'tip'};}
const type=incomeWords.some(w=>msg.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))?'income':expenseWords.some(w=>msg.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))?'expense':null;
if(type){const amount=parseMoney(input.replace(/\b(hoje|ontem)\b/gi,''));if(!amount||amount<=0)return {reply:'Qual foi o valor em reais? Por exemplo: "Gastei R$ 35 no almoço hoje".',intent:'clarification'};const date=new Date(isoDate()+'T12:00:00Z');if(/ontem/.test(msg))date.setUTCDate(date.getUTCDate()-1);const category=classify(input,type);const description=text(input,180);return {reply:`Identifiquei ${type==='income'?'uma receita':'uma despesa'} de ${moneyBRL(amount)} em ${category}. Confirme para registrar.`,intent:'pending',action:{type,amount,category,description,date:date.toISOString().slice(0,10)}};}
return {reply:'Posso registrar gastos e receitas, consultar seu saldo ou mostrar um resumo. Experimente: "Gastei 35 reais no almoço hoje".',intent:'help'};}
app.get('/api/chat',authorize,(req,res)=>res.json(db.prepare('SELECT id,role,content,created_at FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 80').all(req.userId).reverse()));
app.get('/api/ai/status',authorize,(req,res)=>res.json({mode:aiMode(),configured:aiMode()!=='local',provider:(process.env.AI_PROVIDER||'gemini').toLowerCase()}));
app.post('/api/chat',authorize,aiRateLimit,async(req,res,next)=>{try{
 const message=text(req.body.message,500);if(!message)fail('Digite uma mensagem.');
 const mode=aiMode();let reply;
 if(mode==='local') {reply=parseChat(message,req.userId);} else {
   const {interpretation}=await interpretWithAI(message,{today:isoDate(),summary:summary(req.userId,isoDate().slice(0,7))});
   if(interpretation.intent==='transaction'){
     // Impede que o modelo invente valores, inclusive em saídas JSON aparentemente válidas.
     const stated=parseMoney(message);
     if(!stated||Math.abs(stated-interpretation.amount)>0.009){reply={intent:'clarification',reply:'Não consegui confirmar com segurança o valor da mensagem. Informe o valor em números, por exemplo: "Gastei R$ 35 no almoço".'};}
     else if(!interpretation.date||!dateValid(interpretation.date)){reply={intent:'clarification',reply:'Qual é a data desta movimentação? Informe dia, mês e ano.'};}
     else {const candidate={type:interpretation.type,amount:interpretation.amount,category:interpretation.category,description:interpretation.description||text(message,180),date:interpretation.date};
       validateTx(candidate);
       reply={intent:'pending',reply:`Identifiquei ${candidate.type==='income'?'uma receita':'uma despesa'} de ${moneyBRL(candidate.amount)} em ${candidate.category}, data ${candidate.date}. Confirme para registrar.`,action:candidate};}
   } else if(interpretation.intent==='question') {
      // Contas e totais sempre são computados pelo backend, nunca pela IA.
      const local=parseChat(message,req.userId);
      reply=local.intent==='query'||local.intent==='tip'?local:{intent:'question',reply:interpretation.reply||'Consulte suas receitas, despesas ou saldo do mês.'};
   } else reply={intent:'help',reply:interpretation.reply||'Posso ajudar a registrar receitas, despesas e consultar seus resultados.'};
 }
 saveMessage(req.userId,'user',message);let actionId=null;
 if(reply.action){actionId=uid();db.prepare('INSERT INTO pending_actions VALUES(?,?,?,?,?)').run(actionId,req.userId,'transaction',JSON.stringify(reply.action),Date.now());}
 saveMessage(req.userId,'assistant',reply.reply);
 res.json({reply:reply.reply,intent:reply.intent,actionId,action:reply.action||null,mode});
 }catch(e){if(!e.status){console.error('Falha ao consultar provedor de IA:',e.name||'Error');return res.status(502).json({error:'Não foi possível consultar a IA. Verifique a chave, o modelo e o acesso ao serviço. Nenhuma transação foi salva.'});}next(e);}
});
app.post('/api/chat/confirm/:id',authorize,(req,res)=>{const p=db.prepare('SELECT * FROM pending_actions WHERE id=? AND user_id=?').get(req.params.id,req.userId);if(!p)fail('Ação não encontrada ou já concluída.',404);if(Date.now()-p.created_at>15*60*1000){db.prepare('DELETE FROM pending_actions WHERE id=?').run(p.id);fail('Confirmação expirada. Envie a mensagem novamente.',410);}const allowed={};for(const key of ['type','amount','category','description','date'])if(Object.hasOwn(req.body,key))allowed[key]=req.body[key];const t=validateTx({...JSON.parse(p.payload),...allowed});db.transaction(()=>{db.prepare('INSERT INTO transactions VALUES(?,?,?,?,?,?,?,?,?)').run(uid(),req.userId,t.type,t.amount_cents,t.category,t.description,t.date,'chat',now());db.prepare('DELETE FROM pending_actions WHERE id=? AND user_id=?').run(p.id,req.userId);})();saveMessage(req.userId,'assistant',`Registro confirmado: ${moneyBRL(t.amount_cents/100)} em ${t.category}.`);res.json({ok:true});});
app.post('/api/chat/cancel/:id',authorize,(req,res)=>{db.prepare('DELETE FROM pending_actions WHERE id=? AND user_id=?').run(req.params.id,req.userId);res.json({ok:true});});
app.get('/api/health',(req,res)=>res.json({ok:true,service:'Finanças AI'}));
// Rotas desconhecidas da API jamais devem retornar HTML.
app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint não encontrado.'}));
const distDir=path.join(ROOT,'dist');
const indexFile=path.join(distDir,'index.html');
if(process.env.NODE_ENV==='production') {
  if(!fs.existsSync(indexFile)) throw new Error('Build ausente: execute npm run build antes de iniciar em produção.');
  app.use(express.static(distDir));
  app.get('/{*path}',(req,res)=>{
    if(!req.accepts('html')||path.extname(req.path)) return res.sendStatus(404);
    res.sendFile(indexFile);
  });
} else {
  app.get('/',(req,res)=>res.type('text').send('API Finanças AI. Abra o frontend em http://localhost:5173.'));
  app.use((req,res)=>res.status(404).json({error:'Rota não encontrada. Frontend de desenvolvimento: porta 5173.'}));
}
app.use((err,req,res,next)=>{console.error(err.message);res.status(err.status||500).json({error:err.status?err.message:'Erro interno no servidor.'});});
const PORT=Number(process.env.PORT)||3000;

app.listen(PORT,()=>console.log(`Finanças AI em http://localhost:${PORT}`));
