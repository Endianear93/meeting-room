(()=>{
'use strict';
const STORE='simple_meeting_room_v1';
const tabs=[['overview','▣','프로젝트 개요','프로그램 정보를 정리합니다.'],['meetings','▤','회의록','회의 내용을 날짜별로 기록합니다.'],['cast','♙','출연진','출연진과 섭외 상황을 정리합니다.'],['places','⌖','장소·답사','촬영지와 답사 정보를 정리합니다.'],['schedule','▦','일정','회의·촬영 일정을 관리합니다.'],['tasks','✓','결정사항·할 일','담당 업무와 결정을 기록합니다.']];
const schema={meetings:[['date','회의 날짜','date'],['title','회의 제목','text'],['body','논의 내용','textarea'],['decision','결정 사항','textarea']],cast:[['name','이름','text'],['role','역할·포지션','text'],['status','섭외 상태','text'],['notes','메모','textarea']],places:[['name','장소·업체','text'],['area','지역','text'],['reason','선정 이유','textarea'],['status','답사·협의 상태','text']],schedule:[['date','일정','date'],['name','제목','text'],['owner','담당자','text'],['notes','메모','textarea']],tasks:[['name','결정사항·할 일','text'],['owner','담당자','text'],['due','기한','date'],['status','진행 상태','text']]};
function blankProject(name='새 프로젝트'){return {id:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),name,overview:{title:name,subtitle:'',purpose:'',format:'',rules:'',selling:''},meetings:[],cast:[],places:[],schedule:[],tasks:[]}}
function load(){try{let v=JSON.parse(localStorage.getItem(STORE));if(v&&Array.isArray(v.projects)&&v.projects.length)return v}catch(e){}let p=blankProject('새 예능 기획');return {active:p.id,projects:[p]}}
let state=load(),page='overview';
const $=s=>document.querySelector(s), el=(t,c='',txt='')=>{let x=document.createElement(t);if(c)x.className=c;if(txt)x.textContent=txt;return x};
const escapeName=s=>String(s||'').replace(/[\\/:*?"<>|]/g,'_').slice(0,55)||'회의실';
const active=()=>state.projects.find(p=>p.id===state.active)||state.projects[0];
function save(){localStorage.setItem(STORE,JSON.stringify(state));$('#saveStatus').textContent='저장 중…';if(remoteReady) queueSync()}
function nav(){let n=$('#nav');n.replaceChildren();tabs.forEach(([id,icon,name])=>{let b=el('button',page===id?'active':'');let em=el('span','emoji',icon);b.append(em,document.createTextNode(name));b.onclick=()=>{page=id;render()};n.append(b)})}
function projects(){let sel=$('#projectSelect');sel.replaceChildren();state.projects.forEach(p=>{let o=el('option','',p.name);o.value=p.id;sel.append(o)});sel.value=active().id}
function field(parent,label,value,onInput,type='text',full=false){let wrap=el('div','field'+(full?' full':''));let lab=el('label','',label);let inp=type==='textarea'?el('textarea',value.length>150?'tall':''):el('input');if(type!=='textarea')inp.type=type;inp.value=value||'';inp.addEventListener('input',()=>onInput(inp.value));wrap.append(lab,inp);parent.append(wrap);return inp}
function overview(){let p=active(),main=$('#content');main.append(el('div','section-heading','PROGRAM OVERVIEW'));let card=el('article','paper'),fields=el('div','fields');card.append(el('h3','','프로그램 기본 정보'),fields);[['title','프로그램명','text'],['subtitle','한 줄 소개','text'],['purpose','기획 의도','textarea'],['format','포맷·구성','textarea'],['rules','대결 방식·진행 규칙','textarea'],['selling','제작 포인트·광고 포인트','textarea']].forEach(([k,label,type])=>field(fields,label,p.overview[k]||'',v=>{p.overview[k]=v;if(k==='title'&&v){p.name=v;projects()}save()},type,['purpose','format','rules','selling'].includes(k)));main.append(card);main.append(el('div','note','입력한 정보는 현재 브라우저에 자동 저장됩니다. 중요한 내용은 상단의 ‘백업’ 버튼으로 보관하세요.'))}
function records(){let p=active(),main=$('#content');let bar=el('div','toolbar');bar.append(el('h3','',''+tabs.find(x=>x[0]===page)[2]));let add=el('button','add','＋ 항목 추가');add.onclick=()=>{p[page].unshift({id:String(Date.now())+Math.random()});save();render()};bar.append(add);main.append(bar);if(!p[page].length){main.append(el('div','empty','아직 기록이 없어요. ‘항목 추가’를 눌러 시작하세요.'));return}p[page].forEach((rec,i)=>{let card=el('article','record'),head=el('div','record-head');head.append(el('span','record-num',String(i+1).padStart(2,'0')));let del=el('button','danger','삭제');del.onclick=()=>{if(confirm('이 항목을 삭제할까요?')){p[page].splice(i,1);save();render()}};head.append(del);let fields=el('div','fields');schema[page].forEach(([k,label,type])=>field(fields,label,rec[k]||'',v=>{rec[k]=v;save()},type,type==='textarea'));card.append(head,fields);main.append(card)})}
function render(){let meta=tabs.find(x=>x[0]===page);$('#pageTitle').textContent=meta[2];$('#pathLabel').textContent=active().name+' / MEETING ROOM';$('#pageHelp').textContent=meta[3];projects();nav();$('#content').replaceChildren();page==='overview'?overview():records()}
$('#projectSelect').onchange=e=>{state.active=e.target.value;save();page='overview';render()};
$('#addProject').onclick=()=>{let name=prompt('프로젝트 이름을 입력해 주세요.');if(!name||!name.trim())return;let p=blankProject(name.trim());state.projects.push(p);state.active=p.id;save();page='overview';render()};
$('#exportJson').onclick=()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});download(blob,'회의실_백업_'+new Date().toISOString().slice(0,10)+'.json')};
function download(blob,file){let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const sections=[['cover','표지'],['overview','프로그램 개요'],['purpose','기획 의도'],['format','포맷·대결 방식'],['meetings','회의록'],['cast','출연진'],['places','촬영 장소·답사'],['schedule','제작 일정'],['tasks','결정 사항·할 일']];
const dlg=$('#pptDialog');$('#makePpt').onclick=()=>{let parent=$('#slideChoices');parent.replaceChildren();sections.forEach(([id,label])=>{let wrap=el('label','choice');let inp=el('input');inp.type='checkbox';inp.value=id;inp.checked=['cover','overview','purpose','format','cast','places'].includes(id);wrap.append(inp,document.createTextNode(label));parent.append(wrap)});dlg.showModal()};$('#closePpt').onclick=$('#cancelPpt').onclick=()=>dlg.close();
const stringifyRows=(rows,fields)=>rows.map((r,i)=>`${i+1}. `+fields.map(([k,label])=>r[k]?`${label}: ${r[k]}`:'').filter(Boolean).join('  |  ')).filter(Boolean);
function buildSections(p){return {
cover:{title:p.overview.title||p.name,subtitle:p.overview.subtitle||'PROJECT PROPOSAL'},
overview:{title:'프로그램 개요',lines:[`프로그램명  |  ${p.overview.title||p.name}`,`한 줄 소개  |  ${p.overview.subtitle||'미입력'}`,`기획 의도  |  ${p.overview.purpose||'미입력'}`]},
purpose:{title:'기획 의도',lines:[p.overview.purpose||'내용을 입력해 주세요.',p.overview.selling?'제작·광고 포인트\n'+p.overview.selling:'']},
format:{title:'포맷과 진행 방식',lines:[p.overview.format?'포맷\n'+p.overview.format:'',p.overview.rules?'대결 방식·규칙\n'+p.overview.rules:'']},
meetings:{title:'회의록',lines:stringifyRows(p.meetings,[['date','날짜'],['title','제목'],['body','논의'],['decision','결정']])},
cast:{title:'출연진',lines:stringifyRows(p.cast,[['name','이름'],['role','역할'],['status','섭외'],['notes','메모']])},
places:{title:'촬영 장소·답사',lines:stringifyRows(p.places,[['name','장소'],['area','지역'],['reason','선정 이유'],['status','상태']])},
schedule:{title:'제작 일정',lines:stringifyRows(p.schedule,[['date','일정'],['name','제목'],['owner','담당'],['notes','메모']])},
tasks:{title:'결정사항·할 일',lines:stringifyRows(p.tasks,[['name','내용'],['owner','담당'],['due','기한'],['status','상태']])}
}}
function chunkLines(lines,maxChars=390){let chunks=[],cur=[],size=0;for(let original of lines){let text=String(original||'').trim();if(!text)continue;let pieces=[];while(text.length>maxChars){let cut=text.lastIndexOf(' ',maxChars);if(cut<maxChars/2)cut=maxChars;pieces.push(text.slice(0,cut));text=text.slice(cut).trim()}if(text)pieces.push(text);for(let piece of pieces){if(size+piece.length>maxChars||cur.length>=5){chunks.push(cur);cur=[];size=0}cur.push(piece);size+=piece.length}}if(cur.length)chunks.push(cur);return chunks.length?chunks:[['내용을 입력해 주세요.']]}
function slideHeader(slide,title,index,total){slide.background={color:'FFFFFF'};slide.addShape('rect',{x:0,y:0,w:.13,h:7.5,line:{color:'3158E7'},fill:{color:'3158E7'}});slide.addText('MEETING ROOM / PROJECT NOTE',{x:.65,y:.42,w:8,h:.23,fontFace:'Aptos',fontSize:10,color:'8A9BB9',bold:true,charSpacing:1.6,margin:0});slide.addText(title,{x:.65,y:.92,w:11.9,h:.65,fontFace:'Malgun Gothic',fontSize:28,bold:true,color:'172033',breakLine:false,margin:0});slide.addShape('line',{x:.65,y:1.73,w:12,h:0,line:{color:'E3E9F5',width:1.1}});slide.addText(`${index} / ${total}`,{x:11.55,y:7.1,w:1.1,h:.2,fontSize:9,color:'9AA6BB',align:'right',margin:0})}
function addTextBlocks(slide,items){let y=2.05;const n=items.length;const available=4.58;let heights=items.map(s=>Math.max(.42,Math.min(2.45,.34+String(s).length/80*.27+String(s).split('\n').length*.16)));let sum=heights.reduce((a,b)=>a+b,0)+.17*(n-1),scale=Math.min(1,available/sum);for(let i=0;i<n;i++){let h=heights[i]*scale;slide.addShape('roundRect',{x:.68,y,w:11.95,h,rectRadius:.12,line:{color:'E8ECF4',width:.7},fill:{color:'F7F9FD'},radius:.13});let text=items[i];slide.addText(text,{x:.96,y:y+.1,w:11.42,h:Math.max(.22,h-.18),fontFace:'Malgun Gothic',fontSize:text.length>240?10:text.length>120?12:15,color:'23324B',breakLine:false,margin:0.01,vertAlign:'mid',fit:'shrink',valign:'mid'});y+=h+.17}}
$('#downloadPpt').onclick=async()=>{
 const selected=[...$('#slideChoices input:checked')].map(x=>x.value);
 if(!selected.length){alert('페이지를 한 개 이상 선택해 주세요.');return}
 const btn=$('#downloadPpt');btn.disabled=true;btn.textContent='PPTX 만드는 중…';
 try{
  const data=buildSections(active()),pages=[];
  for(const id of selected){const part=data[id];if(id==='cover')pages.push({type:'cover',title:part.title,subtitle:part.subtitle});else{
   const chunks=chunkLines(part.lines);chunks.forEach((lines,i)=>pages.push({type:'body',title:part.title+(chunks.length>1?` (${i+1}/${chunks.length})`:''),lines}));
  }}
  const response=await fetch('/api/pptx',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:active().name,pages})});
  if(!response.ok){let detail;try{detail=(await response.json()).error}catch(e){}throw Error(detail||'서버 오류 '+response.status)}
  const blob=await response.blob();if(blob.size<1000)throw Error('PPT 파일이 비정상적으로 작습니다.');
  download(blob,escapeName(active().name)+'_기획안.pptx');dlg.close();
 }catch(e){console.error('PPT download error',e);alert('PPT 생성 실패: '+e.message)}
 finally{btn.disabled=false;btn.textContent='선택한 페이지로 PPTX 다운로드'}
};
// One simple shared workspace per link. No AI service, account, or API key.
let remoteReady=false,roomId='',roomKey='',revision=0,dirty=false,saving=false,halted=false,saveTimer=null;
const updateStatus=s=>{$('#saveStatus').textContent=s};
const api=async(method,url,payload)=>{const r=await fetch(url,{method,headers:{'content-type':'application/json','x-room-key':roomKey},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});const j=await r.json();if(!r.ok)throw Object.assign(Error(j.error||'서버 오류'),{status:r.status});return j};
function queueSync(){if(halted)return;dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(flushSync,850)}
async function flushSync(){if(saving||!dirty||halted||!remoteReady)return;saving=true;dirty=false;try{let result=await api('PUT','/api/rooms/'+roomId,{state,version:revision});revision=result.version;updateStatus('✓ 팀원과 공유 저장됨')}catch(e){if(e.status===409){halted=true;dirty=true;updateStatus('⚠ 충돌: 백업 후 새로고침 필요');alert('다른 팀원이 먼저 내용을 수정했어. 현재 입력은 이 브라우저에 남아 있어. 상단 ‘백업’으로 저장하고 새로고침해 줘.')}else{dirty=true;updateStatus('⚠ 서버 연결 실패 · 다시 저장 시도')}}finally{saving=false;if(dirty&&!halted)setTimeout(flushSync,4000)}}
async function refresh(){if(!remoteReady||dirty||saving||halted||document.visibilityState==='hidden')return;
  try{let result=await api('GET','/api/rooms/'+roomId);if(result.version!==revision){revision=result.version;state=result.state;localStorage.setItem(STORE,JSON.stringify(state));if(!document.activeElement.matches('input,textarea,select'))render();else updateStatus('다른 팀원 변경 있음 · 입력을 끝내면 반영');}else if(!document.activeElement.matches('input,textarea,select')&&$('#saveStatus').textContent.startsWith('다른 팀원 변경'))render()}
  catch(e){updateStatus('⚠ 서버 연결 확인 필요')}
}
$('#shareRoom').onclick=async()=>{const link=location.href;try{await navigator.clipboard.writeText(link);alert('회의실 링크를 복사했어! 이 링크를 받은 팀원도 같은 내용을 읽고 수정할 수 있어.')}catch(e){prompt('공유할 주소를 복사해 주세요.',link)}};
async function init(){
  const query=new URLSearchParams(location.search);roomId=query.get('room')||'';roomKey=query.get('key')||'';
  try{
    if(roomId&&roomKey){let result=await api('GET','/api/rooms/'+roomId);state=result.state;revision=result.version;}
    else {let result=await api('POST','/api/rooms',{state});roomId=result.id;roomKey=result.key;revision=result.version;const url=new URL(location.href);url.searchParams.set('room',roomId);url.searchParams.set('key',roomKey);history.replaceState(null,'',url.toString());}
    remoteReady=true;render();localStorage.setItem(STORE,JSON.stringify(state));updateStatus('✓ 공유 회의실 연결됨');setInterval(refresh,3500);
  }catch(e){render();updateStatus('⚠ 서버 연결 불가: 임시 로컬 모드');alert('공유 서버에 연결할 수 없어. 인터넷 주소에서 접속했는지 확인해 줘. ('+e.message+')')}
}
render();init();
})();
