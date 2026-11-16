'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const PORT=Number(process.env.PORT)||3000;
const ROOT=path.join(__dirname,'public');
const DATA=process.env.DATA_DIR||path.join(__dirname,'data');
fs.mkdirSync(DATA,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const send=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};
const roomfile=id=>path.join(DATA,`${id}.json`);
function readBody(req){return new Promise((resolve,reject)=>{let data='';req.on('data',c=>{data+=c;if(data.length>1500000){reject(Error('입력 용량 초과'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}
function readRoom(id,key){if(!/^[a-f0-9]{24}$/.test(id)||!key||!fs.existsSync(roomfile(id)))return null;try{const room=JSON.parse(fs.readFileSync(roomfile(id),'utf8'));return room.key===key?room:null}catch{return null}}
function writeRoom(id,room){const tmp=roomfile(id)+'.tmp';fs.writeFileSync(tmp,JSON.stringify(room));fs.renameSync(tmp,roomfile(id))}
function validState(s){return s&&typeof s==='object'&&Array.isArray(s.projects)&&s.projects.length<=100&&JSON.stringify(s).length<1200000}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://localhost:${PORT}`);const name=url.pathname;
    if(name==='/api/health')return send(res,200,{ok:true});
    if(name==='/api/rooms'&&req.method==='POST'){
      const input=await readBody(req);if(!validState(input.state))return send(res,400,{error:'잘못된 회의실 데이터'});
      const id=crypto.randomBytes(12).toString('hex'),key=crypto.randomBytes(24).toString('hex');
      writeRoom(id,{key,state:input.state,version:1,updatedAt:new Date().toISOString()});
      return send(res,201,{id,key,version:1});
    }
    const match=name.match(/^\/api\/rooms\/([a-f0-9]{24})$/);
    if(match){const id=match[1],key=req.headers['x-room-key']||url.searchParams.get('key');const room=readRoom(id,key);
      if(!room)return send(res,404,{error:'회의실이 없거나 접근 권한이 없습니다.'});
      if(req.method==='GET')return send(res,200,{state:room.state,version:room.version,updatedAt:room.updatedAt});
      if(req.method==='PUT'){
        const input=await readBody(req);if(!validState(input.state))return send(res,400,{error:'잘못된 회의실 데이터'});
        // Compare revisions to avoid silently replacing another editor's changes.
        if(input.version!==room.version)return send(res,409,{error:'다른 팀원이 먼저 수정했습니다. 새로고침 후 내용을 확인하세요.',version:room.version});
        room.state=input.state;room.version++;room.updatedAt=new Date().toISOString();writeRoom(id,room);
        return send(res,200,{version:room.version,updatedAt:room.updatedAt});
      }
      return send(res,405,{error:'지원하지 않는 방법'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'지원하지 않는 방법'});
    const dest=path.resolve(ROOT,'.'+decodeURIComponent(name==='/'?'/index.html':name));
    if(!dest.startsWith(ROOT+path.sep))return send(res,403,{error:'접근할 수 없습니다.'});
    fs.stat(dest,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found')};res.writeHead(200,{'content-type':MIME[path.extname(dest)]||'application/octet-stream','x-content-type-options':'nosniff'});fs.createReadStream(dest).pipe(res)});
  }catch(e){send(res,500,{error:e.message})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`회의실 실행: http://localhost:${PORT}`));
