'use strict';
const http=require('node:http');
const pptxgen=require('pptxgenjs');
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
    if(name==='/api/pptx'&&req.method==='POST'){
      const input=await readBody(req);
      if(!Array.isArray(input.pages)||input.pages.length<1||input.pages.length>120)
        return send(res,400,{error:'PPT 페이지를 1~120개 선택해 주세요.'});
      const pptx=new pptxgen();pptx.layout='LAYOUT_WIDE';pptx.author='회의실';
      pptx.title=String(input.name||'회의실').slice(0,100);
      const navy='182953', ink='172033', blue='3158E7';
      for(let index=0;index<input.pages.length;index++){
        const part=input.pages[index],slide=pptx.addSlide();
        const title=String(part.title||'회의실').slice(0,250);
        if(part.type==='cover'){
          slide.background={color:navy};
          slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:.18,h:7.5,line:{color:'6786FF'},fill:{color:'6786FF'}});
          slide.addText('MEETING ROOM / PROJECT PROPOSAL',{x:.85,y:1,w:11,h:.3,color:'B4C5FF',fontSize:12,margin:0});
          slide.addText(title,{x:.85,y:2,w:11.55,h:1.55,fontSize:38,fontFace:'Malgun Gothic',bold:true,color:'FFFFFF',margin:0,breakLine:false});
          slide.addText(String(part.subtitle||''),{x:.85,y:4,w:11.5,h:1.0,fontSize:21,fontFace:'Malgun Gothic',color:'D1DAEF',margin:0});
        } else {
          slide.background={color:'FFFFFF'};
          slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:.12,h:7.5,line:{color:blue},fill:{color:blue}});
          slide.addText('MEETING ROOM / PROJECT NOTE',{x:.7,y:.43,w:10,h:.22,color:'8191AD',fontSize:10,margin:0});
          slide.addText(title,{x:.7,y:.9,w:11.9,h:.7,color:ink,fontFace:'Malgun Gothic',fontSize:28,bold:true,margin:0});
          slide.addShape(pptx.ShapeType.line,{x:.7,y:1.76,w:11.8,h:0,line:{color:'E5EBF5'}});
          const items=(Array.isArray(part.lines)?part.lines:[]).slice(0,6).map(x=>String(x||'').slice(0,2500));
          const blockHeight=Math.min(1.0,4.8/Math.max(1,items.length)-.12);
          let y=2.1;
          for(const item of items){
            slide.addShape(pptx.ShapeType.roundRect,{x:.75,y,w:11.75,h:blockHeight,rectRadius:.08,line:{color:'E8ECF4'},fill:{color:'F7F9FD'}});
            slide.addText(item,{x:1.02,y:y+.08,w:11.2,h:blockHeight-.14,fontFace:'Malgun Gothic',fontSize:item.length>220?10:item.length>100?12:15,color:'23324B',margin:0.01,breakLine:false,fit:'shrink',valign:'mid'});
            y+=blockHeight+.15;
          }
          slide.addText(`${index+1} / ${input.pages.length}`,{x:11.5,y:7.06,w:1.1,h:.2,fontSize:9,color:'9AA6BB',align:'right',margin:0});
        }
      }
      const buffer=await pptx.write({outputType:'nodebuffer'});
      const filename=encodeURIComponent(String(input.name||'회의실').replace(/[\/:*?"<>|]/g,'_').slice(0,70)+'_기획안.pptx');
      res.writeHead(200,{'content-type':'application/vnd.openxmlformats-officedocument.presentationml.presentation','content-disposition':`attachment; filename="meeting-room.pptx"; filename*=UTF-8''${filename}`,'content-length':buffer.length,'cache-control':'no-store'});
      return res.end(buffer);
    }

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
