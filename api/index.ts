import app from '../server/app.ts';
import type {Request,Response} from 'express';
export default function handler(req:Request,res:Response){
 const url=new URL(req.url,'http://internal');
 const route=url.searchParams.get('__fa_route');
 if(route!==null){url.searchParams.delete('__fa_route');req.url='/api/'+route.replace(/^\/+/, '')+(url.searchParams.size?'?'+url.searchParams.toString():'');}
 return app(req,res);
}
