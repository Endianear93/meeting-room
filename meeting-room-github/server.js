'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pptx = require('./pptx');
const URLClass = URL;
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 64 * 1024;
const MAX_FIELD = 6000;
const limiter = new Map();
function send(res, code, value) { const body=JSON.stringify(value); res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body); }
function fail(res, code, message) {send(res,code,{error:message});}
function token() {return crypto.randomBytes(18).toString('base64url');}
function id() {return crypto.randomBytes(9).toString('base64url');}
function validId(x) {return typeof x==='string' && /^[A-Za-z0-9_-]{12}$/.test(x);}
function roomPath(x) {return path.join(DATA_DIR,x+'.json');}
function load(x) {try{return JSON.parse(fs.readFileSync(roomPath(x),'utf8'));}catch{return null;}}
function save(room) {const temp=roomPath(room.id)+'.'+process.pid+'.tmp'; fs.writeFileSync(temp,JSON.stringify(room)); fs.renameSync(temp,roomPath(room.id));}
function bounded(s, max=MAX_FIELD) {return String(s??'').trim().slice(0,max);}
function limit(req,res){const ip=(req.socket.remoteAddress||'unknown');const now=Date.now();let r=limiter.get(ip);if(!r||now-r.start>60000){r={start:now,count:0};limiter.set(ip,r);}r.count++;if(r.count>180){fail(res,429,'요청이 너무 많습니다. 잠시 후 다시 시도하세요.');return false;}if(limiter.size>4000)for(const [k,v] of limiter)if(now-v.start>60000)limiter.delete(k);return true;}
function readJson(req) {return new Promise((resolve,reject)=>{let buf=''; req.on('data',chunk=>{buf+=chunk;if(buf.length>MAX_BODY){reject(new Error('본문이 너무 큽니다.'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(buf||'{}'));}catch{reject(new Error('JSON 형식 오류'));}});req.on('error',reject);});}
const TYPES=['notes','casting','locations','schedule','decisions','tasks'];
function cleanItem(type, raw, previous) {
 if(!raw||typeof raw!=='object')throw new Error('항목이 올바르지 않습니다.');
 const out={id:previous?.id||id(),createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 for(const key of ['title','body','owner','date','status','category'])out[key]=bounded(raw[key],key==='body'?MAX_FIELD:200);
 if(!out.title)throw new Error('제목을 입력하세요.');
 if(type==='tasks' && !['할 일','진행 중','완료'].includes(out.status))out.status='할 일';
 return out;
}
function auth(req,room,access){const raw=req.headers.authorization||'';const given=raw.startsWith('Bearer ')?raw.slice(7):'';const a=Buffer.from(given);function eq(ref){const b=Buffer.from(ref);return a.length===b.length&&crypto.timingSafeEqual(a,b);}if(eq(room.editToken))return 'edit';if(eq(room.viewToken))return 'view';return null;}
function publicRoom(room, role) {const {editToken,viewToken,...data}=room;return {...data,role};}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
function staticFile(req,res,pathname){const target=pathname==='/'?'/index.html':pathname;if(!['/index.html','/app.js','/style.css'].includes(target)){res.writeHead(404);return res.end('Not found');}const file=path.join(PUBLIC_DIR,target);fs.readFile(file,(err,content)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer'});res.end(content);});}
const server=http.createServer(async(req,res)=>{
 if(!limit(req,res))return;
 const url=new URLClass(req.url,'http://localhost'); const pathname=url.pathname;
 if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,service:'meeting-room',storage:fs.existsSync(DATA_DIR)});
 if(!pathname.startsWith('/api/'))return staticFile(req,res,pathname);
 try{
  if(pathname==='/api/rooms'&&req.method==='POST'){
   const body=await readJson(req);let rid=id();while(load(rid))rid=id();
   const room={id:rid,title:bounded(body.title,100)||'새 회의실',description:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1,editToken:token(),viewToken:token(),data:Object.fromEntries(TYPES.map(t=>[t,[]]))};
   save(room);return send(res,201,{room:publicRoom(room,'edit'),editToken:room.editToken,viewToken:room.viewToken});
  }
  const m=pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]{12})(?:\/(items|export|pptx|links))?$/);
  if(!m)return fail(res,404,'찾을 수 없는 주소입니다.');
  const room=load(m[1]);if(!room)return fail(res,404,'회의실을 찾을 수 없습니다.');
  const role=auth(req,room);if(!role)return fail(res,403,'접근 권한이 없습니다.');
  if(req.method==='GET'&&!m[2])return send(res,200,{room:publicRoom(room,role)});
  if(req.method==='GET'&&m[2]==='links'){if(role!=='edit')return fail(res,403,'편집자만 공유 링크를 확인할 수 있습니다.');return send(res,200,{editToken:room.editToken,viewToken:room.viewToken});}
  if(req.method==='GET'&&m[2]==='export')return send(res,200,{room:publicRoom(room,role),exportedAt:new Date().toISOString()});
  if(req.method==='POST'&&m[2]==='pptx'){const body=await readJson(req);const selected=Array.isArray(body.types)?body.types.filter(x=>TYPES.includes(x)):TYPES;const buf=pptx.build(room,selected);res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.presentationml.presentation','Content-Disposition':"attachment; filename=meeting-room.pptx",'Content-Length':buf.length,'Cache-Control':'no-store'});return res.end(buf);}
  if(role!=='edit')return fail(res,403,'읽기 전용 링크입니다.');
  if(req.method==='PATCH'&&!m[2]){
    const body=await readJson(req);room.title=bounded(body.title,100)||room.title;room.description=bounded(body.description,1500);room.version++;room.updatedAt=new Date().toISOString();save(room);return send(res,200,{room:publicRoom(room,role)});
  }
  if(m[2]==='items'&&['POST','PATCH','DELETE'].includes(req.method)){
    const body=await readJson(req);if(!TYPES.includes(body.type))return fail(res,400,'알 수 없는 항목입니다.');const list=room.data[body.type];
    if(req.method==='POST'){if(list.length>=250)return fail(res,400,'탭당 최대 250개 항목을 저장할 수 있습니다.');list.unshift(cleanItem(body.type,body.item));}
    else {const index=list.findIndex(x=>x.id===body.id);if(index<0)return fail(res,404,'항목을 찾지 못했습니다.');if(req.method==='DELETE')list.splice(index,1);else list[index]=cleanItem(body.type,body.item,list[index]);}
    room.version++;room.updatedAt=new Date().toISOString();save(room);return send(res,200,{room:publicRoom(room,role)});
  }
  return fail(res,405,'지원하지 않는 요청입니다.');
 }catch(e){return fail(res,400,e.message||'요청 처리 실패');}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`회의실 서버 실행: http://localhost:${PORT}`));
