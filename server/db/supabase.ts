// Supabase HTTPS API; no database password or browser-side secret.
export class RemoteError extends Error {
 readonly status: number;
 constructor(status:number, message:string) { super(message); this.name='RemoteError'; this.status=status; }
}
export function settings(){
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url || !key) throw new RemoteError(503,'Configure o Supabase no servidor.');
 const u=new URL(url);
 if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash) throw new RemoteError(503,'URL do Supabase inválida.');
 return {url:u.origin,key};
}
export async function remote(path:string, method='GET', body?:unknown, token?:string, admin=false, headers:Record<string,string>={}){
 const cfg=settings(), key=admin?process.env.SUPABASE_SECRET_KEY:cfg.key;
 if(!key) throw new RemoteError(503,'Configuração de servidor incompleta.');
 const h: Record<string,string>={apikey:key,'Content-Type':'application/json',...headers};
 if(token) h.Authorization='Bearer '+token;
 else if(key.startsWith('eyJ')) h.Authorization='Bearer '+key;
 const res=await fetch(cfg.url+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const value=await res.json().catch(()=>null);
 if(!res.ok) throw new RemoteError(res.status===401?401:res.status===429?429:res.status===409?409:res.status>=500?503:400, res.status===401?'Sessão inválida ou expirada.':res.status===429?'Limite de requisições. Tente mais tarde.':res.status===409?'Registro em conflito.':res.status>=500?'Serviço indisponível.':'Não foi possível concluir a operação.');
 return value;
}
export function auth(path:string,method='GET',body?:unknown,token?:string,admin=false){return remote('/auth/v1'+path,method,body,token,admin);}
export function data(table:string,token:string,method='GET',filters:Record<string,string>={},body?:unknown){
 const q=new URLSearchParams(filters);
 return remote('/rest/v1/'+table+'?'+q,method,body,token,false,{Prefer:'return=representation'});
}
export async function allRows(table:string,token:string,filters:Record<string,string>={}){
 const out:any[]=[]; for(let offset=0;offset<100000;offset+=500){
 const rows=await data(table,token,'GET',{...filters,limit:'500',offset:String(offset)});
 if(!Array.isArray(rows)) throw new RemoteError(503,'Resposta de banco inválida.');
 out.push(...rows); if(rows.length<500)return out;
 } throw new RemoteError(422,'Histórico muito extenso para este relatório.');
}
export function rpc(name:string,token:string,body:unknown){return remote('/rest/v1/rpc/'+name,'POST',body,token);}
