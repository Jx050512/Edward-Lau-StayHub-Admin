/** StayHub Admin localhost preview, with /api/ proxied to local Public netlify dev.
 * Run Public first: netlify dev --port 8888; then node scripts/dev-admin.mjs
 * This script is development-only; it is NOT inside the published site folder.
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('../site/', import.meta.url)));
const port=Number(process.env.STAYHUB_ADMIN_PORT || 8889);
const publicOrigin=process.env.STAYHUB_LOCAL_PUBLIC || 'http://127.0.0.1:8888';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname.startsWith('/api/')){
   const chunks=[];let bytes=0;
   for await(const chunk of req){bytes+=chunk.length;if(bytes>5000000){res.writeHead(413).end('Body too large');return;}chunks.push(chunk);}
   const headers={};for(const key of ['content-type','authorization','accept'])if(req.headers[key])headers[key]=req.headers[key];
   const upstream=await fetch(publicOrigin+u.pathname+u.search,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
   const body=Buffer.from(await upstream.arrayBuffer());res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'});res.end(body);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const file=resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const info=await stat(file).catch(()=>null);
  if(!info?.isFile()){res.writeHead(404).end('Not found');return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch(err){res.writeHead(502,{'Content-Type':'text/plain'}).end('Admin preview error: '+err.message);}
});
server.listen(port,'127.0.0.1',()=>console.log(`StayHub Admin: http://127.0.0.1:${port}  | API → ${publicOrigin}/api/`));
