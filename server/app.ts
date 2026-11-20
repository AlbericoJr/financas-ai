import 'dotenv/config';
import express from 'express';
import type {Request,Response,NextFunction} from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {allowedOrigins,originAllowed} from './lib/security.ts';
import {aiMode,interpretWithAI} from './services/ai-provider.ts';
import {auth,data,allRows,rpc,remote,RemoteError} from './db/supabase.ts';
const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'35kb'}));
app.use('/api', (_req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
app.use('/api',(req,res,next)=>{
 if(!originAllowed({origin:req.get('origin'),fetchSite:req.get('sec-fetch-site'),method:req.method,contentType:req.get('content-type')},allowedOrigins(process.env))) return res.status(403).json({error:'Origem não autorizada.'});
 next();
});
const limit=rateLimit({windowMs:900000,limit:25,standardHeaders:'draft-8',legacyHeaders:false,validate:{trustProxy:false,xForwardedForHeader:false}});
const fail=(message:string,status=400):never=>{throw new RemoteError(status,message)};
const text=(v:unknown,max=160)=>String(v??'').trim().slice(0,max);
const money=(v:unknown)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>100000000||Math.round(n*100)<1)fail('Informe um valor válido.');return Math.round(n*100)};
const dateValid=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+'T12:00:00Z').valueOf())&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const isoDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const cookieOpts={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production'||!!process.env.VERCEL,path:'/'};
function cookies(req:Request){return Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split(/=(.*)/s).slice(0,2)).filter(v=>v.length===2));}
function setSession(res:Response,s:any){if(!s.access_token||!s.refresh_token)fail('Sessão indisponível.',401);res.cookie('fa_access',s.access_token,{...cookieOpts,maxAge:7*86400000});res.cookie('fa_refresh',s.refresh_token,{...cookieOpts,maxAge:7*86400000});}
function clearSession(res:Response){res.clearCookie('fa_access',cookieOpts);res.clearCookie('fa_refresh',cookieOpts);}
type Session={token:string,user:any};
const sessions=new WeakMap<Request,Session>();
async function authorize(req:Request,res:Response,next:NextFunction){
 const c=cookies(req);let token=c.fa_access;let user:any;
 if(token){try{user=await auth('/user','GET',undefined,token);}catch(e){if(!(e instanceof RemoteError)||e.status!==401)throw e;}}
 // Refresh only on the single /me bootstrap request, never concurrently on data routes.
 if(!user&&c.fa_refresh&&req.method==='GET'&&req.path==='/api/me'){
  try{const s=await auth('/token?grant_type=refresh_token','POST',{refresh_token:c.fa_refresh});setSession(res,s);token=s.access_token;user=await auth('/user','GET',undefined,token);}
  catch(e){if(e instanceof RemoteError&&e.status<500){clearSession(res);return res.status(401).json({error:'Faça login novamente.'});}throw e;}
 }
 if(!user||!token||!user.id||user.is_anonymous)return res.status(401).json({error:'Faça login para continuar.'});
 sessions.set(req,{token,user});next();
}
const ctx=(req:Request)=>sessions.get(req)!;
const owner=(req:Request)=>({user_id:'eq.'+ctx(req).user.id});
const row=(a:any[])=>a?.[0];
const existing=(a:any[],msg:string)=>{if(!a?.length)fail(msg,404);return a[0]};
const txPublic=(t:any)=>({...t,amount:Number(t.amount_cents)/100});
const goalPublic=(g:any)=>({...g,target:Number(g.target_cents)/100,saved:Number(g.saved_cents)/100});
function summary(all:any[],month:string){const monthly=all.filter(t=>t.date.startsWith(month));const income=monthly.filter(t=>t.type==='income').reduce((a,t)=>a+Number(t.amount_cents),0);const expenses=monthly.filter(t=>t.type==='expense').reduce((a,t)=>a+Number(t.amount_cents),0);const balance=all.reduce((a,t)=>a+(t.type==='income'?1:-1)*Number(t.amount_cents),0);const categories=new Map<string,number>();for(const t of monthly.filter(t=>t.type==='expense'))categories.set(t.category,(categories.get(t.category)||0)+Number(t.amount_cents));return {income:income/100,expenses:expenses/100,balance:balance/100,available:(income-expenses)/100,count:monthly.length,categories:[...categories].map(([name,cents])=>({name,value:cents/100})).sort((a,b)=>b.value-a.value)}}
function validateTx(b:any){if(!['income','expense'].includes(b.type))fail('Tipo inválido.');const date=b.date||isoDate();if(!dateValid(date))fail('Data inválida.');const category=text(b.category,40)||'Outros';return {type:b.type,amount_cents:money(b.amount),category,description:text(b.description,180)||category,date};}
const transactions=(req:Request)=>allRows('transactions',ctx(req).token,{...owner(req),order:'date.desc,created_at.desc,id.desc'});
const goals=(req:Request)=>allRows('goals',ctx(req).token,{...owner(req),order:'created_at.desc,id.desc'});
async function profile(req:Request){const {token,user}=ctx(req);let p=row(await data('profiles',token,'GET',owner(req)));if(!p){try{p=row(await data('profiles',token,'POST',{}, {user_id:user.id,name:text(user.user_metadata?.name,90)}));}catch(e){if(!(e instanceof RemoteError)||e.status!==409)throw e;p=row(await data('profiles',token,'GET',owner(req)));}}return {id:user.id,email:user.email,name:p?.name||text(user.user_metadata?.name,90),profile:{theme:p?.theme||'auto',monthly_income:Number(p?.monthly_income_cents||0)/100,onboarded:!!p?.onboarded}};}
app.post('/api/auth/register',limit,async(req,res)=>{const name=text(req.body.name,90),email=text(req.body.email,180),password=req.body.password;if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8||password.length>128)fail('Informe nome, e-mail e senha de 8 a 128 caracteres.');const s=await auth('/signup','POST',{email,password,data:{name}});if(s.access_token)setSession(res,s);res.status(201).json({confirmationRequired:!s.access_token});});
app.post('/api/auth/login',limit,async(req,res)=>{const email=text(req.body.email,180),password=req.body.password;if(typeof password!=='string'||password.length>128)fail('Credenciais inválidas.');const s=await auth('/token?grant_type=password','POST',{email,password});setSession(res,s);res.json({ok:true});});
app.get('/api/me',authorize,async(req,res)=>res.json(await profile(req)));
app.post('/api/auth/logout',async(req,res)=>{const c=cookies(req);if(c.fa_access){try{await auth('/logout?scope=local','POST',undefined,c.fa_access);}catch(e){if(!(e instanceof RemoteError)||e.status>=500)throw e;}}clearSession(res);res.json({ok:true});});
app.patch('/api/me',authorize,async(req,res)=>{await profile(req);const b=req.body,p:any={};if(b.name!==undefined){p.name=text(b.name,90);if(p.name.length<2)fail('Nome inválido.');}if(b.monthly_income!==undefined){const n=Number(b.monthly_income);if(!Number.isFinite(n)||n<0||n>100000000)fail('Renda inválida.');p.monthly_income_cents=Math.round(n*100);}if(['light','dark','auto'].includes(b.theme))p.theme=b.theme;if(typeof b.onboarded==='boolean')p.onboarded=b.onboarded;if(Object.keys(p).length)await data('profiles',ctx(req).token,'PATCH',owner(req),p);res.json({ok:true});});
app.delete('/api/me',authorize,async(req,res)=>{const {user,token}=ctx(req);await auth('/logout?scope=global','POST',undefined,token);await auth('/admin/users/'+encodeURIComponent(user.id),'DELETE',undefined,undefined,true);clearSession(res);res.json({ok:true});});
app.get('/api/dashboard',authorize,async(req,res)=>{const all=await transactions(req);const month=typeof req.query.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month)?req.query.month:isoDate().slice(0,7);res.json({...summary(all,month),recent:all.slice(0,6).map(txPublic),goals:(await goals(req)).map(goalPublic)});});
app.get('/api/transactions',authorize,async(req,res)=>{let a=await transactions(req);if(req.query.month)a=a.filter(t=>t.date.startsWith(String(req.query.month)));if(req.query.type)a=a.filter(t=>t.type===req.query.type);if(req.query.category)a=a.filter(t=>t.category===req.query.category);if(req.query.q)a=a.filter(t=>(t.description+' '+t.category).toLowerCase().includes(String(req.query.q).toLowerCase()));res.json(a.slice(0,500).map(txPublic));});
app.post('/api/transactions',authorize,async(req,res)=>res.status(201).json(txPublic(row(await data('transactions',ctx(req).token,'POST',{}, {...validateTx(req.body),user_id:ctx(req).user.id,source:'manual'})))));
app.patch('/api/transactions/:id',authorize,async(req,res)=>{const f={...owner(req),id:'eq.'+req.params.id},token=ctx(req).token;const old=existing(await data('transactions',token,'GET',f),'Transação não encontrada.');existing(await data('transactions',token,'PATCH',f,validateTx({...txPublic(old),...req.body})),'Transação não encontrada.');res.json({ok:true});});
app.delete('/api/transactions/:id',authorize,async(req,res)=>{existing(await data('transactions',ctx(req).token,'DELETE',{...owner(req),id:'eq.'+req.params.id}),'Transação não encontrada.');res.json({ok:true});});
app.get('/api/goals',authorize,async(req,res)=>res.json((await goals(req)).map(goalPublic)));
function validateGoal(b:any){const name=text(b.name,100),deadline=b.deadline||null;if(!name||deadline&&!dateValid(deadline))fail('Meta inválida.');return {name,target_cents:money(b.target),deadline};}
app.post('/api/goals',authorize,async(req,res)=>res.status(201).json(goalPublic(row(await data('goals',ctx(req).token,'POST',{}, {...validateGoal(req.body),user_id:ctx(req).user.id})))));
app.patch('/api/goals/:id',authorize,async(req,res)=>{const f={...owner(req),id:'eq.'+req.params.id},token=ctx(req).token;const prev=existing(await data('goals',token,'GET',f),'Meta não encontrada.');existing(await data('goals',token,'PATCH',f,validateGoal({...goalPublic(prev),...req.body})),'Meta não encontrada.');res.json({ok:true});});
app.delete('/api/goals/:id',authorize,async(req,res)=>{existing(await data('goals',ctx(req).token,'DELETE',{...owner(req),id:'eq.'+req.params.id}),'Meta não encontrada.');res.json({ok:true});});
app.post('/api/goals/:id/contributions',authorize,async(req,res)=>{await rpc('contribute_goal',ctx(req).token,{p_id:req.params.id,p_amount:money(req.body.amount)});res.json({ok:true});});
app.get('/api/reports',authorize,async(req,res)=>{const all=await transactions(req),months=[];for(let i=5;i>=0;i--){const d=new Date(isoDate().slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-i);const month=d.toISOString().slice(0,7);months.push({month,...summary(all,month)});}res.json({months});});
const moneyBRL = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const expenseWords = ['gastei', 'paguei', 'comprei', 'despesa', 'pago', 'gastou'];
const incomeWords = ['recebi', 'ganhei', 'salário', 'salario', 'receita', 'vendi', 'entrada', 'depositaram'];
const classify = (s, type) => { const x = s.toLowerCase(); if (type === 'income')
    return /sal[aá]rio|pagamento|holerite/.test(x) ? 'Salário' : 'Outras receitas'; for (const [cat, pattern] of [['Alimentação', /almo[cç]o|jantar|caf[eé]|mercado|supermercado|lanche|restaurante|padaria|comida|ifood/], ['Transporte', /uber|99\b|[oô]nibus|combust[ií]vel|gasolina|transporte|metr[oô]|estacionamento/], ['Moradia', /aluguel|condom[ií]nio|luz|energia|[aá]gua|internet|moradia/], ['Saúde', /farm[aá]cia|m[eé]dico|consulta|rem[eé]dio|sa[uú]de/], ['Educação', /curso|escola|livro|faculdade|educa[cç][aã]o/], ['Assinaturas', /netflix|spotify|assinatura|streaming/], ['Lazer', /cinema|viagem|lazer|show|festa/], ['Compras', /roupa|sapato|celular|notebook|compras/]])
    if (pattern.test(x))
        return cat; return 'Outros gastos'; };
function parseMoney(s: string) { const m = s.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d.,])\s*(?:reais|real|r\$)?/i); if (!m)
    return null; let t = m[1]; if (t.includes(',') && t.includes('.'))
    t = t.replaceAll('.', '').replace(',', '.');
else if (t.includes(','))
    t = t.replace(',', '.');
else if (/^\d{1,3}(\.\d{3})+$/.test(t))
    t = t.replaceAll('.', ''); return Number(t); }
function parseChat(input: string, s: ReturnType<typeof summary>) {
    const msg = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const month = isoDate().slice(0, 7);

    if (/(quanto|total|resumo|saldo|gastos|despesas|receitas|economiz)/.test(msg) && !/(gastei|paguei|recebi|ganhei|comprei)/.test(msg)) {
        if (/saldo/.test(msg))
            return { reply: `Seu saldo acumulado registrado é ${moneyBRL(s.balance)}.`, intent: 'query' };
        const cat = Object.entries({ alimentacao: 'Alimentação', transporte: 'Transporte', moradia: 'Moradia', saude: 'Saúde', educacao: 'Educação', lazer: 'Lazer', compras: 'Compras', assinaturas: 'Assinaturas' }).find(([k]) => msg.includes(k));
        if (cat) {
            const value = s.categories.find(c => c.name === cat[1])?.value || 0;
            return { reply: `Neste mês você registrou ${moneyBRL(value)} em ${cat[1]}.`, intent: 'query' };
        }
        return { reply: `Neste mês: receitas ${moneyBRL(s.income)}, despesas ${moneyBRL(s.expenses)} e resultado ${moneyBRL(s.available)}.`, intent: 'query' };
    }
    if (/(dica|sugest|ajud|economizar)/.test(msg) && !/(gastei|paguei|recebi)/.test(msg)) {
        const top = s.categories[0];
        return { reply: top ? `Sua maior categoria de despesas neste mês é ${top.name} (${moneyBRL(top.value)}). Confira os lançamentos dessa categoria e identifique gastos que podem ser reduzidos.` : 'Comece registrando receitas e despesas. Com alguns lançamentos, consigo mostrar quais categorias pesam mais no seu orçamento.', intent: 'tip' };
    }
    const type = incomeWords.some(w => msg.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) ? 'income' : expenseWords.some(w => msg.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) ? 'expense' : null;
    if (type) {
        const amount = parseMoney(input.replace(/\b(hoje|ontem)\b/gi, ''));
        if (!amount || amount <= 0)
            return { reply: 'Qual foi o valor em reais? Por exemplo: "Gastei R$ 35 no almoço hoje".', intent: 'clarification' };
        const date = new Date(isoDate() + 'T12:00:00Z');
        if (/ontem/.test(msg))
            date.setUTCDate(date.getUTCDate() - 1);
        const category = classify(input, type);
        const description = text(input, 180);
        return { reply: `Identifiquei ${type === 'income' ? 'uma receita' : 'uma despesa'} de ${moneyBRL(amount)} em ${category}. Confirme para registrar.`, intent: 'pending', action: { type, amount, category, description, date: date.toISOString().slice(0, 10) } };
    }
    return { reply: 'Posso registrar gastos e receitas, consultar seu saldo ou mostrar um resumo. Experimente: "Gastei 35 reais no almoço hoje".', intent: 'help' };
}

app.get('/api/chat',authorize,async(req,res)=>{const a=await data('messages',ctx(req).token,'GET',{...owner(req),order:'created_at.desc,id.desc',limit:'80'});res.json(a.reverse());});
app.get('/api/ai/status',authorize,(_req,res)=>res.json({mode:aiMode(),configured:aiMode()!=='local'}));
app.post('/api/chat',authorize,async(req,res)=>{const {token,user}=ctx(req);const message=text(req.body.message,500);if(!message)fail('Digite uma mensagem.');const s=summary(await transactions(req),isoDate().slice(0,7));if(aiMode()!=='local'){const ok=await remote('/rest/v1/rpc/reserve_ai_request','POST',{p_user:user.id},undefined,true);if(ok!==true)fail('Limite de IA atingido. Tente na próxima hora.',429);}
try{
        const mode = aiMode();
        let reply;
        if (mode === 'local') {
            reply = parseChat(message, s);
        }
        else {
            const { interpretation } = await interpretWithAI(message, { today: isoDate(), summary: s });
            if (interpretation.intent === 'transaction') {
                // Impede que o modelo invente valores, inclusive em saídas JSON aparentemente válidas.
                const stated = parseMoney(message);
                if (!stated || Math.abs(stated - interpretation.amount) > 0.009) {
                    reply = { intent: 'clarification', reply: 'Não consegui confirmar com segurança o valor da mensagem. Informe o valor em números, por exemplo: "Gastei R$ 35 no almoço".' };
                }
                else if (!interpretation.date || !dateValid(interpretation.date)) {
                    reply = { intent: 'clarification', reply: 'Qual é a data desta movimentação? Informe dia, mês e ano.' };
                }
                else {
                    const candidate = { type: interpretation.type, amount: interpretation.amount, category: interpretation.category, description: interpretation.description || text(message, 180), date: interpretation.date };
                    validateTx(candidate);
                    reply = { intent: 'pending', reply: `Identifiquei ${candidate.type === 'income' ? 'uma receita' : 'uma despesa'} de ${moneyBRL(candidate.amount)} em ${candidate.category}, data ${candidate.date}. Confirme para registrar.`, action: candidate };
                }
            }
            else if (interpretation.intent === 'question') {
                // Contas e totais sempre são computados pelo backend, nunca pela IA.
                const local = parseChat(message, s);
                reply = local.intent === 'query' || local.intent === 'tip' ? local : { intent: 'question', reply: interpretation.reply || 'Consulte suas receitas, despesas ou saldo do mês.' };
            }
            else
                reply = { intent: 'help', reply: interpretation.reply || 'Posso ajudar a registrar receitas, despesas e consultar seus resultados.' };
        }

let actionId=null;if(reply.action){const p=row(await data('pending_actions',token,'POST',{}, {user_id:user.id,kind:'transaction',payload:reply.action}));actionId=p.id;}
await data('messages',token,'POST',{},[{user_id:user.id,role:'user',content:message},{user_id:user.id,role:'assistant',content:reply.reply}]);
res.json({reply:reply.reply,intent:reply.intent,actionId,action:reply.action||null,mode});
}catch(e){if(e instanceof RemoteError)throw e;throw new RemoteError(502,'Não foi possível consultar o assistente. Nenhuma transação foi registrada.');}});
app.post('/api/chat/confirm/:id',authorize,async(req,res)=>{const {token,user}=ctx(req);const p=existing(await data('pending_actions',token,'GET',{...owner(req),id:'eq.'+req.params.id}),'Ação não encontrada.');if(Date.now()-Date.parse(p.created_at)>900000)fail('Confirmação expirada.',410);const allowed:any={};for(const k of ['type','amount','category','description','date'])if(Object.hasOwn(req.body,k))allowed[k]=req.body[k];const t=validateTx({...p.payload,...allowed});await rpc('confirm_transaction',token,{p_id:p.id,p_type:t.type,p_amount:t.amount_cents,p_category:t.category,p_description:t.description,p_date:t.date});res.json({ok:true});});
app.post('/api/chat/cancel/:id',authorize,async(req,res)=>{await data('pending_actions',ctx(req).token,'DELETE',{...owner(req),id:'eq.'+req.params.id});res.json({ok:true});});
app.get('/api/health',(_req,res)=>{const supabaseConfigured=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY);res.status(supabaseConfigured?200:503).json({ok:supabaseConfigured,service:'Finanças AI',supabaseConfigured});});
app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint não encontrado.'}));
app.use((err:any,_req:Request,res:Response,_next:NextFunction)=>{const status=err instanceof RemoteError?err.status:err?.status===400?400:500;res.status(status).json({error:err instanceof RemoteError?err.message:'Erro interno no servidor.'});});
export default app;
