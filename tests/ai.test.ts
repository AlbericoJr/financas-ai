import test from 'node:test';
import assert from 'node:assert/strict';
import {aiMode,interpretWithAI,validateInterpretation} from '../server/services/ai-provider.ts';
const sample={intent:'transaction',type:'expense',amount:35,category:'Alimentação',description:'Almoço',date:'2026-11-12',reply:''};
const summary={income:2000,expenses:100,balance:1900,available:1900,categories:[{name:'Alimentação',value:100}]};
test('sem chave Gemini usa regras locais',()=>{
 assert.equal(aiMode({AI_PROVIDER:'gemini',GEMINI_API_KEY:''}),'local');
 assert.equal(aiMode({AI_PROVIDER:'local',GEMINI_API_KEY:'ABC'}),'local');
});
test('modo desconhecido bloqueado',()=>assert.throws(()=>aiMode({AI_PROVIDER:'unknown'}),/AI_PROVIDER/));
test('estrutura de transação validada e categorias restritas',()=>{
 assert.deepEqual(validateInterpretation(sample),{intent:'transaction',type:'expense',amount:35,category:'Alimentação',description:'Almoço',date:'2026-11-12'});
 assert.equal(validateInterpretation({...sample,category:'categoria inventada'}).category,'Outros gastos');
 assert.throws(()=>validateInterpretation({...sample,amount:Infinity}),/Valor inválido/);
});
test('Gemini é chamado apenas pelo servidor e texto é interpretado por JSON',async()=>{
 let invoked=false;
 const out=await interpretWithAI('Gastei R$ 35 no almoço hoje',{env:{AI_PROVIDER:'gemini',GEMINI_API_KEY:'chave-ficticia-para-teste'},today:'2026-11-12',summary,adapters:{gemini:({message,context})=>{
   invoked=true;assert.equal(message,'Gastei R$ 35 no almoço hoje');assert.equal(context.summary.balance,1900);assert.equal(context.userId,undefined);return JSON.stringify(sample);
 }}});
 assert.equal(invoked,true);assert.equal(out.mode,'gemini');assert.equal(out.interpretation.amount,35);
});
test('resposta inválida de provedor externo não salva uma operação',async()=>{
 await assert.rejects(interpretWithAI('Gastei R$ 35',{env:{AI_PROVIDER:'gemini',GEMINI_API_KEY:'fake'},today:'2026-11-12',summary,adapters:{gemini:()=>'{not json'}}),/JSON válido/);
});
