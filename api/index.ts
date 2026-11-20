import app from '../server/app.ts';
import type {Request,Response} from 'express';
export default function handler(req:Request,res:Response){
 const url=new URL(req.url || '/', 'http://internal');
 // Vercel may preserve the original URL or pass the rewritten URL.
 const route=url.searchParams.get('__fa_route');
 if(route!==null){
   url.searchParams.delete('__fa_route');
   req.url='/api/'+route.replace(/^\/+/, '')+(url.searchParams.size?'?'+url.searchParams.toString():'');
 } else if(url.pathname==='/api/index'||url.pathname==='/api'){
   req.url='/api/health';
 }
 return app(req,res);
}
