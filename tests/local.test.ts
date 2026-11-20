import test from 'node:test';
import assert from 'node:assert/strict';
import {api,request} from '../src/services/api.ts';
import {summarize,suggest,validateTx} from '../src/services/localStore.ts';
import {today} from '../src/lib/format.ts';
const storage=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},configurable:true});
test('local transactions, goals, reload and chat confirmation',async()=>{
 storage.clear();
 await request('/transactions',{type:'income',amount:100,category:'Salário',description:'Teste',date:today()});
 const d=await api<any>('/dashboard');assert.equal(d.balance,100);
 await request('/goals',{name:'Reserva',target:200,deadline:null});
 const [g]=await api<any[]>('/goals');await request('/goals/'+g.id+'/contributions',{amount:20});assert.equal((await api<any[]>('/goals'))[0].saved,20);
 const c=await request<any>('/chat',{message:'Gastei R$ 35,50 no almoço hoje'});assert.equal(c.action.amount,35.5);assert.equal((await api<any>('/dashboard')).balance,100);
 await request('/chat/confirm/'+c.actionId,{});assert.equal((await api<any>('/dashboard')).balance,64.5);
 await assert.rejects(request('/chat/confirm/'+c.actionId,{}));assert.equal(await api('/pending'),null);
});
test('invalid money and date',()=>{assert.throws(()=>validateTx({type:'expense',amount:0,date:today(),category:'Outros',description:'x'}));assert.throws(()=>validateTx({type:'expense',amount:1,date:'2026-02-30',category:'Outros',description:'x'}));});
test('decimal and ambiguous amounts',()=>{const s=summarize([],today().slice(0,7));assert.equal(suggest('Recebi R$ 1.234,56',s).action?.amount,1234.56);assert.equal(suggest('Gastei 10.50 reais',s).action?.amount,10.5);assert.equal(suggest('Gastei 10 e 20',s).action,null);});
