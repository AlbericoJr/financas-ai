import type { Tx, TxInput, Goal, GoalInput, Message, Pending, Summary } from '../types';
import { today, money } from '../lib/format';
type State={transactions:Tx[];goals:Goal[];messages:Message[];pending:Pending|null};
const KEY='financas-ai.local.v1';
export function read():State {
 const raw=localStorage.getItem(KEY);
 if(!raw)return {transactions:[],goals:[],messages:[],pending:null};
 const s=JSON.parse(raw);
 if(!s||!Array.isArray(s.transactions)||!Array.isArray(s.goals)||!Array.isArray(s.messages))throw new Error('Dados locais inválidos. Preserve o armazenamento antes de tentar recuperar.');
 return {...s,pending:s.pending||null};
}
export function write(s:State){localStorage.setItem(KEY,JSON.stringify(s));}
export const id=()=>crypto.randomUUID();
const cents=(n:number)=>Math.round(n*100);
const validAmount=(n:unknown)=>{const v=Number(n);if(!Number.isFinite(v)||v>100000000||Math.round(v*100)<1)throw new Error('Informe um valor válido.');return cents(v)/100;};
const validDate=(d:string)=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export function validateTx(t:TxInput):TxInput{
 if(!['income','expense'].includes(t.type)||!validDate(t.date))throw new Error('Tipo ou data inválidos.');
 return {type:t.type,amount:validAmount(t.amount),category:String(t.category||'Outros').slice(0,40),description:String(t.description||t.category||'Outros').slice(0,180),date:t.date};
}
export function validateGoal(g:GoalInput):GoalInput{
 const name=String(g.name||'').trim().slice(0,100);if(!name||g.deadline&&!validDate(g.deadline))throw new Error('Meta inválida.');
 return {name,target:validAmount(g.target),deadline:g.deadline||null};
}
export function summarize(all:Tx[],month:string):Summary{
 const m=all.filter(t=>t.date.startsWith(month)), cats=new Map<string,number>();
 let income=0,expenses=0,balance=0;
 for(const t of all)balance+=(t.type==='income'?1:-1)*cents(t.amount);
 for(const t of m){const n=cents(t.amount);if(t.type==='income')income+=n;else{expenses+=n;cats.set(t.category,(cats.get(t.category)||0)+n);}}
 return {income:income/100,expenses:expenses/100,balance:balance/100,available:(income-expenses)/100,count:m.length,categories:[...cats].map(([name,value])=>({name,value:value/100})).sort((a,b)=>b.value-a.value)};
}
export function suggest(message:string,s:Summary):{reply:string;action:TxInput|null}{
 const normalized=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const type=/\b(recebi|ganhei|vendi)\b/.test(normalized)?'income':/\b(gastei|paguei|comprei)\b/.test(normalized)?'expense':null;
 if(type){
 const matches=[...message.matchAll(/(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{1,2})?|\d+\.\d{1,2})(?![\d.,])/gi)]; 
 if(matches.length!==1)return {reply:'Informe um único valor em reais para o lançamento.',action:null};
 const raw=matches[0][1];const amount=Number(raw.includes(',')?raw.replaceAll('.','').replace(',','.'): /^\d{1,3}(\.\d{3})+$/.test(raw)?raw.replaceAll('.',''):raw);
 const date=new Date(today()+'T12:00:00Z');if(/\bontem\b/.test(normalized))date.setUTCDate(date.getUTCDate()-1);
 const category=type==='income'?(/salario/.test(normalized)?'Salário':'Outras receitas'):/almoco|mercado|jantar|lanche|comida|restaurante/.test(normalized)?'Alimentação':/uber|transporte|gasolina|onibus/.test(normalized)?'Transporte':/aluguel|energia|internet/.test(normalized)?'Moradia':'Outros gastos';
 try{const action=validateTx({type,amount,category,description:message,date:date.toISOString().slice(0,10)});return {reply:'Identifiquei '+money(amount)+' em '+category+'. Confira os dados e confirme para registrar.',action};}catch{return {reply:'Informe um valor válido em reais.',action:null};}
 }
 if(/saldo/.test(normalized))return {reply:'Saldo acumulado: '+money(s.balance)+'.',action:null};
 if(/dica|economiz/.test(normalized))return {reply:s.categories[0]?'Sua maior categoria neste mês é '+s.categories[0].name+' ('+money(s.categories[0].value)+'). Revise esses gastos.':'Registre suas receitas e despesas para conhecer seus hábitos.',action:null};
 if(/quanto|resumo|gastos|despesas|receitas|total/.test(normalized))return {reply:'Neste mês: receitas '+money(s.income)+', despesas '+money(s.expenses)+', resultado '+money(s.available)+'.',action:null};
 return {reply:'Posso registrar receitas e despesas, consultar seu saldo e apresentar um resumo. Ex.: Gastei R$ 35 no almoço hoje.',action:null};
}
