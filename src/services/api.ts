import type {TxInput,GoalInput} from '../types/index.ts';
import {read,write,id,validateTx,validateGoal,summarize,suggest} from './localStore.ts';
import {today} from '../lib/format.ts';
function as<T>(v:unknown):T{return v as T;}
export async function api<T=unknown>(path:string,options:RequestInit={}):Promise<T>{
 const s=read(),method=options.method||'GET',body=options.body?JSON.parse(String(options.body)):{},parts=path.split('/').filter(Boolean);
 const month=today().slice(0,7);
 if(method==='GET'){
 if(path==='/dashboard')return as<T>(summarize(s.transactions,month));
 if(path==='/transactions')return as<T>([...s.transactions].sort((a,b)=>b.date.localeCompare(a.date)));
 if(path==='/goals')return as<T>(s.goals);
 if(path==='/chat')return as<T>(s.messages);
 if(path==='/pending')return as<T>(s.pending);
 if(path==='/reports'){const months=[];for(let i=5;i>=0;i--){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-i);const m=d.toISOString().slice(0,7);months.push({month:m,...summarize(s.transactions,m)});}return as<T>({months});}
 }
 if(parts[0]==='transactions'){
 if(method==='POST'&&!parts[1])s.transactions.push({...validateTx(body as TxInput),id:id(),source:'manual'});
 else {const i=s.transactions.findIndex(t=>t.id===parts[1]);if(i<0)throw new Error('Transação não encontrada.');if(method==='DELETE')s.transactions.splice(i,1);else if(method==='PATCH')s.transactions[i]={...s.transactions[i],...validateTx({...s.transactions[i],...body})};else throw new Error('Operação inválida.');}
 }else if(parts[0]==='goals'){
 if(method==='POST'&&!parts[1])s.goals.push({...validateGoal(body as GoalInput),id:id(),saved:0});
 else{const i=s.goals.findIndex(g=>g.id===parts[1]);if(i<0)throw new Error('Meta não encontrada.');const g=s.goals[i];
 if(method==='DELETE')s.goals.splice(i,1);else if(method==='PATCH')s.goals[i]={...g,...validateGoal({...g,...body})};else if(method==='POST'&&parts[2]==='contributions'){const n=Number(body.amount);if(!Number.isFinite(n)||n<=0||n>100000000||Math.round(n*100)<1)throw new Error('Valor inválido.');g.saved=(Math.round(g.saved*100)+Math.round(n*100))/100;}else throw new Error('Operação inválida.');}
 }else if(path==='/chat'&&method==='POST'){
 if(s.pending)throw new Error('Conclua o lançamento pendente.');
 const message=String(body.message||'').trim().slice(0,500);if(!message)throw new Error('Digite uma mensagem.');
 const result=suggest(message,summarize(s.transactions,month));
 s.pending=result.action?{actionId:id(),action:result.action}:null;
 s.messages.push({id:id(),role:'user',content:message},{id:id(),role:'assistant',content:result.reply});write(s);
 return as<T>({reply:result.reply,actionId:s.pending?.actionId||null,action:result.action});
 }else if(parts[0]==='chat'&&method==='POST'&&['confirm','cancel'].includes(parts[1])){
 if(!s.pending||s.pending.actionId!==parts[2])throw new Error('Ação não encontrada.');
 if(parts[1]==='confirm'){s.transactions.push({...validateTx({...s.pending.action,...body}),id:id(),source:'chat'});s.messages.push({id:id(),role:'assistant',content:'Lançamento confirmado.'});}
 s.pending=null;
 }else throw new Error('Operação não disponível.');
 write(s);return as<T>({ok:true});
}
export const request=<T=unknown>(path:string,data:unknown,method='POST')=>api<T>(path,{method,body:JSON.stringify(data)});
export const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Falha na operação.';
