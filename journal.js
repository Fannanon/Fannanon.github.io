/* ==========================================================
   An Aussie in America: shared behaviour for every page.
   - Contents page (<body class="contents">): draws the time scale.
   - Journal pages (<body data-photos="page-name">): photo boxes,
     full-screen viewer, and the edit-mode lock (only on your own computer).
   ========================================================== */
(function(){
'use strict';
var body=document.body;
function $(s,r){return(r||document).querySelector(s)}

/* ---------------- Contents page: time scale ---------------- */
function initRail(){
 var main=$('main'),rail=document.createElement('div');
 rail.className='rail';rail.setAttribute('aria-hidden','true');main.insertBefore(rail,main.firstChild);
 var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DAY=864e5,MAXSPAN=70;
 function el(c,css,txt){var d=document.createElement('div');d.className=c;for(var k in css)d.style[k]=css[k];if(txt!=null)d.innerHTML=txt;rail.appendChild(d);return d}
 function build(){
  rail.innerHTML='';
  var mt=main.getBoundingClientRect().top;
  var pts=[].map.call(document.querySelectorAll('li[data-date]'),function(li){
   var r=li.getBoundingClientRect();return{t:Date.parse(li.getAttribute('data-date')+'T00:00:00Z'),y:r.top-mt+r.height/2}
  }).sort(function(a,b){return a.t-b.t});
  if(pts.length<2)return;
  for(var i=0;i<pts.length-1;i++){
   var a=pts[i],b=pts[i+1],gap=(b.t-a.t)/DAY>MAXSPAN;
   el('seg'+(gap?' gap':''),{top:a.y+'px',height:(b.y-a.y)+'px'});
   if(gap)continue;
   var d=new Date(a.t),y=d.getUTCFullYear(),m=d.getUTCMonth()+1;
   for(;;m++){
    var t=Date.UTC(y,m,1);if(t>=b.t)break;
    var yy=a.y+(t-a.t)/(b.t-a.t)*(b.y-a.y);
    if(yy-a.y<26||b.y-yy<26)continue;
    var mo=((m%12)+12)%12,yr=y+Math.floor(m/12);
    el('tick',{top:yy+'px'});
    el('lbl',{top:yy+'px'},MON[mo]+(mo===0?' ’'+String(yr).slice(2):''));
   }
  }
  pts.forEach(function(p){
   var d=new Date(p.t);
   el('anchor',{top:p.y+'px'});
   el('lbl a',{top:p.y+'px'},d.getUTCDate()+' '+MON[d.getUTCMonth()]+'<br>'+d.getUTCFullYear());
  });
 }
 build();
 window.addEventListener('load',build);
 if(window.ResizeObserver)new ResizeObserver(build).observe(main);else window.addEventListener('resize',build);
}

/* ---------------- Journal pages: photos ---------------- */
function initPhotos(slug){
 var main=$('main'),bar=$('.bar');
 bar.insertAdjacentHTML('beforeend','<button id="lock" class="lock" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path id="shackle" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span id="locklabel">Edit mode off</span></button>');
 /* ---- previous / next links under the Contents link ---- */
 var pn=document.createElement('nav');pn.className='pn';pn.setAttribute('aria-label','Previous and next entry');
 bar.insertAdjacentElement('afterend',pn);
 function nav(){
  var T=window.JOURNAL_TOC||[],k=-1;T.forEach(function(e,j){if(e[0]===slug)k=j});
  pn.innerHTML='';if(k<0)return;
  function add(e,txt,rel){var a=document.createElement('a');a.className='back';a.href=e[0]+'.html';a.title=e[1];a.rel=rel;a.textContent=txt;pn.appendChild(a)}
  if(k>0)add(T[k-1],'← Previous','prev');
  if(k<T.length-1)add(T[k+1],'Next →','next');
 }
 var ts=document.createElement('script');ts.src='toc.js'+(location.protocol==='file:'||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)?'?t='+Date.now():'');
 ts.onload=ts.onerror=nav;document.head.appendChild(ts);
 main.insertAdjacentHTML('beforeend','<section class="photos" id="photos" aria-label="Photos" hidden><div class="editbar" id="editbar" hidden><p id="hint">Edit mode is on. Click the text to edit it, the + box to add photos, or type under a photo to caption it. Use the × on a photo to remove it. Then save into your repo folder.</p><div class="row fmt" id="fmt"><button class="btn" type="button" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button><button class="btn" type="button" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button><button class="btn" type="button" data-cmd="link" title="Turn the selected words into a link">Link</button><button class="btn" type="button" data-cmd="clear" title="Remove bold, italic and links from the selection">Clear</button><button class="btn" type="button" id="discard" hidden>Discard changes</button></div><p id="status" role="status"></p><div class="row"><button class="btn" id="save" type="button">Save to repo folder</button><button class="btn" id="export" type="button">Download as zip</button><button class="btn" id="clear" type="button">Clear local copies</button></div></div><ul class="thumbs" id="thumbs"></ul></section>');
 body.insertAdjacentHTML('beforeend','<input id="file" type="file" accept="image/*" multiple hidden><div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden><img id="lbimg" alt=""><button class="close" id="lbclose" type="button">Close</button><button class="prev" id="lbprev" type="button" aria-label="Previous photo">&#8249;</button><button class="next" id="lbnext" type="button" aria-label="Next photo">&#8250;</button><p class="lbcap" id="lbcap" hidden></p><div class="count" id="lbcount"></div></div>');

 var lockBtn=$('#lock'),lockLabel=$('#locklabel'),shackle=$('#shackle'),panel=$('#photos'),bar2=$('#editbar'),
  grid=$('#thumbs'),fileIn=$('#file'),statusEl=$('#status'),exportBtn=$('#export'),saveBtn=$('#save'),clearBtn=$('#clear'),fmt=$('#fmt'),discardBtn=$('#discard'),article=$('article'),
  lb=$('#lb'),lbImg=$('#lbimg'),lbCount=$('#lbcount'),lbCap=$('#lbcap'),lbClose=$('#lbclose'),lbPrev=$('#lbprev'),lbNext=$('#lbnext');
 var DIR='photos/'+slug+'/';
 var LOCAL=location.protocol==='file:'||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
 var PUB=[],edit=false;
 try{edit=LOCAL&&localStorage.getItem('journalEdit')==='1'}catch(e){}
 if(!LOCAL)lockBtn.hidden=true;
 if(!window.showDirectoryPicker)saveBtn.hidden=true;
 var textDirty=false,draftKey='journalText:'+slug,pubText=article.innerHTML,draftLoaded=false,saveTimer=null;
 /* ---- date under the heading ---- */
 var DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
 function ord(n){var v=n%100;if(v>=11&&v<=13)return n+'th';return n+(['th','st','nd','rd'][n%10]||'th')}
 function fmtDate(iso){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');if(!m)return '';
  var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
  if(d.getUTCFullYear()!==+m[1]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[3])return '';
  return DAYS[d.getUTCDay()]+', '+ord(d.getUTCDate())+' '+MONTHS[d.getUTCMonth()]+' '+d.getUTCFullYear();
 }
 var h1=$('h1'),dateEl=$('.date');
 if(!dateEl){dateEl=document.createElement('p');dateEl.className='date';h1.insertAdjacentElement('afterend',dateEl)}
 var pubDate=dateEl.getAttribute('data-date')||'',curDate=pubDate,dateDirty=false,dateKey='journalDate:'+slug;
 dateEl.insertAdjacentHTML('afterend','<div class="datebar" id="datebar" hidden><label for="datepick">Date</label><input type="date" id="datepick"><button class="btn" type="button" id="dateclear">Clear date</button></div>');
 var dateBar=$('#datebar'),datePick=$('#datepick'),dateClear=$('#dateclear');
 function renderDate(){
  var t=fmtDate(curDate);
  dateEl.textContent=t;dateEl.hidden=!t;
  if(t)dateEl.setAttribute('data-date',curDate);else dateEl.removeAttribute('data-date');
  datePick.value=t?curDate:'';dateClear.disabled=!t;
 }
 renderDate();
 var local=[],db=null,urls=[],items=[],replaceId=null,tempId=-1,lbIdx=0,lastFocus=null,note='';

 /* ---- drafts kept in this browser (before saving to the repo) ---- */
 function openDb(){return new Promise(function(res){try{
  var r=indexedDB.open('journal-photos',2);
  r.onupgradeneeded=function(){
   var d=r.result,t=r.transaction;
   if(!d.objectStoreNames.contains('drafts')){
    var st=d.createObjectStore('drafts',{keyPath:'id',autoIncrement:true});
    if(d.objectStoreNames.contains('intro')){
     t.objectStore('intro').getAll().onsuccess=function(e){e.target.result.forEach(function(x){st.add({blob:x.blob,slug:'introduction'})})};
    }
   }
  };
  r.onsuccess=function(){res(r.result)};r.onerror=r.onblocked=function(){res(null)};
 }catch(e){res(null)}})}
 function tx(mode,fn){return new Promise(function(res,rej){
  if(!db){res(null);return}
  try{var t=db.transaction('drafts',mode),req=fn(t.objectStore('drafts'));
  t.oncomplete=function(){res(req&&req.result)};t.onerror=t.onabort=function(){rej(t.error)};}catch(e){rej(e)}
 })}
 function dropAllDrafts(){
  return tx('readwrite',function(s){
   var q=s.openCursor();q.onsuccess=function(){var c=q.result;if(c){if(c.value.slug===slug)c.delete();c.continue()}};return q;
  }).catch(function(){});
 }

 async function prep(file){
  var bmp=await createImageBitmap(file);
  var s=Math.min(1,2000/Math.max(bmp.width,bmp.height));
  var c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  if(bmp.close)bmp.close();
  return new Promise(function(r){c.toBlob(r,'image/jpeg',.82)});
 }

 /* ---- drawing the photo boxes ---- */
 function all(){return PUB.map(function(p){return{src:p.src,pub:true,p:p,cap:p.cap,removed:p.removed}}).concat(local.map(function(l){return{blob:l.blob,id:l.id,l:l,cap:l.cap||''}}))}
 /* ---- changes to already-published photos (removals, captions) wait here until saved ---- */
 var photoKey='journalPhotos:'+slug,capTimers={};
 function pubDelta(){var r=[],c={};PUB.forEach(function(p){if(p.removed)r.push(p.src);if(p.cap!==p.orig)c[p.src]=p.cap});return{r:r,c:c}}
 function pubCounts(){var d=pubDelta();return{rm:d.r.length,cap:Object.keys(d.c).filter(function(k){return d.r.indexOf(k)<0}).length}}
 function pubDirty(){var k=pubCounts(),d=pubDelta();return !!(k.rm||k.cap||Object.keys(d.c).length)}
 function savePubDraft(){try{if(pubDirty())localStorage.setItem(photoKey,JSON.stringify(pubDelta()));else localStorage.removeItem(photoKey)}catch(e){}}
 function saveLocalCap(l){
  if(!(l.id>0))return;clearTimeout(capTimers[l.id]);
  capTimers[l.id]=setTimeout(function(){tx('readwrite',function(st){return st.put({id:l.id,blob:l.blob,slug:slug,cap:l.cap||''})}).catch(function(){})},400);
 }
 /* ---- editable text ---- */
 try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}
 function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\u00a0/g,' ')}
 function inline(n){
  var out='';
  [].forEach.call(n.childNodes,function(c){
   if(c.nodeType===3){out+=esc(c.nodeValue);return}
   if(c.nodeType!==1)return;
   var t=c.tagName.toLowerCase(),k=inline(c),st=c.style||{};
   if(t==='br')out+='<br>';
   else if(t==='b'||t==='strong'||/^(bold|[6-9]00)$/.test(st.fontWeight||''))out+=k?'<strong>'+k+'</strong>':'';
   else if(t==='i'||t==='em'||st.fontStyle==='italic')out+=k?'<em>'+k+'</em>':'';
   else if(t==='a'){
    var h=c.getAttribute('href')||'',ok=!/^[a-z][a-z0-9+.\-]*:/i.test(h)||/^(https?|mailto):/i.test(h);
    out+=ok&&h?'<a href="'+h.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'+k+'</a>':k;
   }else out+=k;
  });
  return out.replace(/<\/strong><strong>/g,'').replace(/<\/em><em>/g,'');
 }
 function serialize(){
  var ps=[],cur='';
  function add(h){h=h.replace(/(<br>)+$/,'').trim();if(h.replace(/<br>/g,'').trim())ps.push(h)}
  [].forEach.call(article.childNodes,function(n){
   if(n.nodeType===1&&/^(p|div|h[1-6]|li|ul|ol|blockquote)$/i.test(n.tagName)){add(cur);cur='';add(inline(n))}
   else if(n.nodeType===3)cur+=esc(n.nodeValue);
   else if(n.nodeType===1)cur+=inline({childNodes:[n]});
  });
  add(cur);
  return ps;
 }
 function asHtml(ps){return ps.map(function(p){return'<p>'+p+'</p>'}).join('\n')}
 function mark(){article.classList.toggle('blank',!article.textContent.trim())}
 function onEdit(){
  if(!article.firstElementChild)article.innerHTML='<p><br></p>';
  mark();textDirty=true;updateBar();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){try{localStorage.setItem(draftKey,asHtml(serialize()))}catch(e){}},400);
 }
 function setEditable(){
  if(edit){
   if(!draftLoaded){
    draftLoaded=true;
    try{var dd=localStorage.getItem(dateKey);if(dd!==null&&dd!==pubDate&&(dd===''||fmtDate(dd))){curDate=dd;dateDirty=true;renderDate()}}catch(e){}
    try{var d=localStorage.getItem(draftKey);if(d!==null&&d!==asHtml(serialize())){article.innerHTML=d;textDirty=true}}catch(e){}
   }
   dateBar.hidden=false;
   article.setAttribute('contenteditable','true');article.setAttribute('role','textbox');article.setAttribute('aria-multiline','true');
   article.setAttribute('aria-label','Page text. Editing is on.');article.classList.add('editing');mark();
  }else{
   dateBar.hidden=true;
   article.removeAttribute('contenteditable');article.removeAttribute('role');article.removeAttribute('aria-multiline');
   article.removeAttribute('aria-label');article.classList.remove('editing','blank');
  }
 }
 function insertPlain(t){
  t.replace(/\r\n?/g,'\n').split('\n').map(function(l){return l.replace(/\s+$/,'')}).filter(function(l){return l.trim()}).forEach(function(l,i){
   if(i)document.execCommand('insertParagraph');
   document.execCommand('insertText',false,l);
  });
 }
 article.addEventListener('input',function(){if(edit)onEdit()});
 article.addEventListener('focus',function(){if(edit&&!article.firstElementChild){article.innerHTML='<p><br></p>';var r=document.createRange();r.setStart(article.firstChild,0);r.collapse(true);var sel=getSelection();sel.removeAllRanges();sel.addRange(r)}});
 article.addEventListener('paste',function(e){
  if(!edit)return;e.preventDefault();
  insertPlain((e.clipboardData||window.clipboardData).getData('text/plain'));
 });
 article.addEventListener('drop',function(e){if(edit)e.preventDefault()});
 fmt.addEventListener('mousedown',function(e){if(e.target.closest('[data-cmd]'))e.preventDefault()});
 fmt.addEventListener('click',function(e){
  var b=e.target.closest('[data-cmd]');if(!b)return;
  var c=b.getAttribute('data-cmd'),sel=getSelection();
  if(!sel.rangeCount||!article.contains(sel.anchorNode)){article.focus();return}
  if(c==='bold'||c==='italic')document.execCommand(c);
  else if(c==='clear'){document.execCommand('removeFormat');document.execCommand('unlink')}
  else if(c==='link'){
   var r=sel.getRangeAt(0).cloneRange(),u=prompt('Link address (for example https://…)','https://');
   if(!u||u==='https://')return;
   sel.removeAllRanges();sel.addRange(r);
   if(r.collapsed)document.execCommand('insertHTML',false,'<a href="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">'+esc(u)+'</a>');
   else document.execCommand('createLink',false,u);
  }
  onEdit();
 });
 function onDate(v){
  curDate=(v===''||fmtDate(v))?v:curDate;dateDirty=curDate!==pubDate;renderDate();
  try{if(dateDirty)localStorage.setItem(dateKey,curDate);else localStorage.removeItem(dateKey)}catch(e){}
  note='';updateBar();
 }
 datePick.addEventListener('input',function(){onDate(datePick.value)});
 datePick.addEventListener('change',function(){onDate(datePick.value)});
 dateClear.addEventListener('click',function(){onDate('')});
 discardBtn.addEventListener('click',function(){
  if(!confirm('Throw away your unsaved changes to the text, date, captions and removed photos on this page? (Photos waiting to be added are not affected.)'))return;
  article.innerHTML=pubText;textDirty=false;mark();try{localStorage.removeItem(draftKey)}catch(e){}
  curDate=pubDate;dateDirty=false;renderDate();try{localStorage.removeItem(dateKey)}catch(e){}
  PUB.forEach(function(p){p.removed=false;p.cap=p.orig});savePubDraft();
  note='';render();
 });

 function render(){
  setEditable();
  urls.forEach(function(u){URL.revokeObjectURL(u)});urls=[];
  items=all();
  lockBtn.setAttribute('aria-pressed',edit?'true':'false');
  lockLabel.textContent=edit?'Edit mode on':'Edit mode off';
  shackle.setAttribute('d',edit?'M8 11V8a4 4 0 0 1 7.5-1.9':'M8 11V8a4 4 0 0 1 8 0v3');
  bar2.hidden=!edit;
  panel.hidden=!edit&&!items.length;
  grid.innerHTML='';
  items.forEach(function(it,i){
   it.url=it.src||URL.createObjectURL(it.blob);if(it.blob)urls.push(it.url);
   var li=document.createElement('li'),b=document.createElement('button');
   var replace=edit&&!it.pub;
   b.type='button';b.className='tile'+(replace?' edit':'');
   b.setAttribute('data-act',replace?'replace':'view');b.setAttribute('data-i',i);
   b.setAttribute('aria-label',replace?'Replace photo '+(i+1):'View photo '+(i+1)+' full screen');
   var img=document.createElement('img');img.src=it.url;img.alt=it.cap||'Photo '+(i+1);img.decoding='async';
   b.appendChild(img);var ph=document.createElement('div');ph.className='ph';ph.appendChild(b);li.appendChild(ph);
   if(edit){
    var x=document.createElement('button');x.type='button';x.className='x';x.setAttribute('data-i',i);
    if(replace){x.textContent='×';x.setAttribute('data-act','remove');x.setAttribute('aria-label','Remove photo '+(i+1))}
    else{
     x.textContent=it.removed?'↺':'×';x.setAttribute('data-act','toggle');
     x.setAttribute('aria-label',(it.removed?'Keep photo ':'Remove photo ')+(i+1));
     x.title=it.removed?'Keep this photo':'Remove this photo when you save';
    }
    ph.appendChild(x);
    if(replace||it.removed){var t=document.createElement('span');t.className='tag';t.textContent=replace?'Not published':'Will be removed on save';ph.appendChild(t)}
    if(it.removed)li.className='gone';
    var ci=document.createElement('input');ci.type='text';ci.className='capin';ci.maxLength=300;ci.value=it.cap||'';
    ci.placeholder='Add a caption';ci.disabled=!!it.removed;ci.setAttribute('data-cap',i);ci.setAttribute('aria-label','Caption for photo '+(i+1));
    li.appendChild(ci);
   }else if(it.cap){
    var cp=document.createElement('p');cp.className='cap';cp.textContent=it.cap;li.appendChild(cp);
   }
   grid.appendChild(li);
  });
  if(edit){
   var li=document.createElement('li'),a=document.createElement('button');
   a.type='button';a.className='tile add';a.setAttribute('data-act','add');
   a.innerHTML='<b>+</b><span>Add photo</span>';li.appendChild(a);grid.appendChild(li);
  }
  updateBar();
 }
 function updateBar(){
  var n=local.length,parts=[];
  var pd0=pubDirty(),pk=pubCounts();clearBtn.disabled=!n;exportBtn.disabled=!(n||pd0);saveBtn.disabled=!(n||textDirty||dateDirty||pd0);discardBtn.hidden=!(textDirty||dateDirty||pd0);
  lockLabel.textContent=(edit?'Edit mode on':'Edit mode off')+((n||textDirty||dateDirty||pd0)?' *':'');
  if(textDirty)parts.push('text changes');
  if(dateDirty)parts.push('a date change');
  if(n)parts.push(n+' new photo'+(n===1?'':'s'));
  if(pk.rm)parts.push(pk.rm+' photo'+(pk.rm===1?'':'s')+' to remove');
  if(pd0&&(pk.cap||!pk.rm))parts.push('caption changes');
  var msg=parts.length?(parts.length>1?parts.slice(0,-1).join(', ')+' and '+parts[parts.length-1]:parts[0])+' waiting. Save to the repo folder to publish.':'Nothing waiting to be saved.';
  statusEl.textContent=note||(msg.charAt(0).toUpperCase()+msg.slice(1))+(db?'':' This browser cannot keep photos between visits.');
 }
 function say(m){note=m;render();note=''}

 /* ---- full-screen viewer ---- */
 function show(){var c=items[lbIdx].cap||'';lbImg.src=items[lbIdx].url;lbImg.alt=c||'Photo '+(lbIdx+1);lbCap.textContent=c;lbCap.hidden=!c;lbCount.textContent=(lbIdx+1)+' / '+items.length;lbPrev.hidden=lbNext.hidden=items.length<2}
 function openLb(i){lbIdx=i;lastFocus=document.activeElement;show();lb.hidden=false;body.style.overflow='hidden';lbClose.focus()}
 function closeLb(){lb.hidden=true;lbImg.removeAttribute('src');body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus()}
 function step(d){lbIdx=(lbIdx+d+items.length)%items.length;show()}
 lbClose.onclick=closeLb;lbPrev.onclick=function(){step(-1)};lbNext.onclick=function(){step(1)};
 lb.addEventListener('click',function(e){if(e.target===lb)closeLb()});
 document.addEventListener('keydown',function(e){
  if(lb.hidden)return;
  if(e.key==='Escape')closeLb();
  else if(e.key==='ArrowLeft'&&items.length>1)step(-1);
  else if(e.key==='ArrowRight'&&items.length>1)step(1);
  else if(e.key==='Tab'){
   var f=[lbClose,lbPrev,lbNext].filter(function(b){return !b.hidden}),i=f.indexOf(document.activeElement);
   e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();
  }
 });

 /* ---- clicks, uploads, lock ---- */
 grid.addEventListener('click',function(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  var act=el.getAttribute('data-act'),i=+el.getAttribute('data-i'),it=items[i];
  if(act==='view')openLb(i);
  else if(act==='add'){replaceId=null;fileIn.value='';fileIn.click()}
  else if(act==='replace'){replaceId=it.id;fileIn.value='';fileIn.click()}
  else if(act==='toggle'){it.p.removed=!it.p.removed;savePubDraft();note='';render()}
  else if(act==='remove'){
   local=local.filter(function(l){return l.id!==it.id});note='';
   if(it.id>0)tx('readwrite',function(s){return s.delete(it.id)}).catch(function(){});
   render();
  }
 });
 grid.addEventListener('input',function(e){
  var el=e.target.closest('[data-cap]');if(!el)return;
  var it=items[+el.getAttribute('data-cap')];if(!it)return;
  if(it.pub){it.p.cap=el.value;savePubDraft()}else{it.l.cap=el.value;saveLocalCap(it.l)}
  note='';updateBar();
 });
 fileIn.addEventListener('change',async function(){
  var files=[].slice.call(fileIn.files),bad=[];
  if(!files.length)return;
  statusEl.textContent='Resizing '+files.length+' photo'+(files.length===1?'':'s')+'…';
  if(replaceId!==null)files=files.slice(0,1);
  for(var k=0;k<files.length;k++){
   try{
    var blob=await prep(files[k]),rec;
    if(replaceId!==null){
     rec=local.filter(function(l){return l.id===replaceId})[0];if(!rec)continue;rec.blob=blob;
     if(rec.id>0)await tx('readwrite',function(s){return s.put({id:rec.id,blob:blob,slug:slug,cap:rec.cap||''})}).catch(function(){});
    }else{
     var id=tempId--;
     try{var got=await tx('readwrite',function(s){return s.add({blob:blob,slug:slug})});if(got)id=got}catch(e){}
     local.push({id:id,blob:blob,cap:''});
    }
   }catch(err){bad.push(files[k].name)}
  }
  replaceId=null;
  say(bad.length?'Could not read: '+bad.join(', ')+'. Try JPEG or PNG.':'');
 });
 lockBtn.addEventListener('click',function(){
  if(!LOCAL)return;
  edit=!edit;try{localStorage.setItem('journalEdit',edit?'1':'0')}catch(e){}
  note='';render();
 });
 clearBtn.addEventListener('click',function(){
  if(!confirm('Remove the '+local.length+' photo(s) saved in this browser? Only do this after you have published them.'))return;
  local=[];dropAllDrafts();render();
 });

 /* ---- save straight into the repo folder (Chrome / Edge) ---- */
 function manifestText(ents){
  var list=ents.map(function(e){var o={src:e.src};if(e.caption)o.caption=e.caption;return o});
  return 'window.JOURNAL_PHOTOS=window.JOURNAL_PHOTOS||{};\n'+'window.JOURNAL_PHOTOS['+JSON.stringify(slug)+']='+JSON.stringify(list,null,1)+';\n';
 }
 saveBtn.addEventListener('click',async function(){
  var dir;
  try{dir=await window.showDirectoryPicker({mode:'readwrite',id:'journal-repo'})}
  catch(e){if(e&&e.name==='AbortError')return;say('Could not open that folder.');return}
  try{await dir.getFileHandle('style.css');await dir.getFileHandle('journal.js')}catch(e){
   say('That folder does not look like the journal repo (no style.css and journal.js). Choose the repo folder itself (Fannanon.github.io).');return;
  }
  var did=[];
  try{
   if(textDirty){
    var fh=await dir.getFileHandle(slug+'.html'),src=await(await fh.getFile()).text();
    var m=/<article\b[^>]*>[\s\S]*?<\/article>/.exec(src);
    if(!m)throw new Error('could not find the text area in '+slug+'.html');
    var html=asHtml(serialize()),tw=await fh.createWritable();
    await tw.write(src.slice(0,m.index)+'<article>\n'+html+'\n</article>'+src.slice(m.index+m[0].length));await tw.close();
    article.innerHTML=html;pubText=html;textDirty=false;
    try{localStorage.removeItem(draftKey)}catch(e){}
    did.push('the text');
   }
   if(dateDirty){
    var dh=await dir.getFileHandle(slug+'.html'),dsrc=await(await dh.getFile()).text(),dtxt=fmtDate(curDate);
    var tag=dtxt?'<p class="date" data-date="'+curDate+'">'+dtxt+'</p>':'';
    var dre=/\s*<p class="date"[^>]*>[\s\S]*?<\/p>/,out;
    if(dre.test(dsrc))out=dsrc.replace(dre,tag?'\n'+tag:'');
    else if(/<\/h1>/.test(dsrc))out=dsrc.replace(/<\/h1>/,function(x){return x+(tag?'\n'+tag:'')});
    else throw new Error('could not find the heading in '+slug+'.html');
    var dw=await dh.createWritable();await dw.write(out);await dw.close();
    /* keep the contents page time scale in step */
    var ih=await dir.getFileHandle('index.html'),isrc=await(await ih.getFile()).text();
    var ire=new RegExp('<li(?: data-date="[^"]*")?>(\\s*<a [^>]*href="'+slug.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\.html")');
    if(ire.test(isrc)){
     var iout=isrc.replace(ire,function(x,a){return '<li'+(dtxt?' data-date="'+curDate+'"':'')+'>'+a});
     if(iout!==isrc){var iw=await ih.createWritable();await iw.write(iout);await iw.close()}
    }
    pubDate=curDate;dateDirty=false;try{localStorage.removeItem(dateKey)}catch(e){}
    did.push('the date');
   }
   if(local.length||pubDirty()){
    var pd=await dir.getDirectoryHandle('photos',{create:true}),sd=await pd.getDirectoryHandle(slug,{create:true});
    var ents=PUB.map(function(p){return{src:p.src,caption:p.orig}});
    try{
     var f=await(await sd.getFileHandle('photos.js')).getFile(),mm0=(await f.text()).match(/\[[\s\S]*\]/);
     if(mm0)ents=JSON.parse(mm0[0]).map(function(x){return typeof x==='string'?{src:x,caption:''}:{src:x.src,caption:x.caption||''}});
    }catch(e){}
    var rm={},capOf={},nAdd=local.length,gone=[],capN=0;
    PUB.forEach(function(p){if(p.removed)rm[p.src]=1;else if(p.cap!==p.orig){capOf[p.src]=p.cap;capN++}});
    ents=ents.filter(function(e){if(rm[e.src]){gone.push(e.src);return false}return true});
    ents.forEach(function(e){if(Object.prototype.hasOwnProperty.call(capOf,e.src))e.caption=capOf[e.src].trim()});
    var n=Math.max.apply(null,ents.map(function(p){return +((p.src.match(/(\d+)\.\w+$/)||[0,0])[1])}).concat([0]));
    for await(var ent of sd.values()){var mm=ent.name.match(/^photo-(\d+)\./);if(mm)n=Math.max(n,+mm[1])}
    for(var i=0;i<local.length;i++){
     n++;var fn='photo-'+(n<10?'0':'')+n+'.jpg';
     var w=await(await sd.getFileHandle(fn,{create:true})).createWritable();await w.write(local[i].blob);await w.close();
     ents.push({src:DIR+fn,caption:(local[i].cap||'').trim()});
    }
    var mw=await(await sd.getFileHandle('photos.js',{create:true})).createWritable();
    await mw.write(manifestText(ents));await mw.close();
    for(var g=0;g<gone.length;g++){
     var gn=gone[g];
     if(gn.indexOf(DIR)===0&&gn.indexOf('/',DIR.length)<0){try{await sd.removeEntry(gn.slice(DIR.length))}catch(e){}}
    }
    if(nAdd)did.push(nAdd+' new photo'+(nAdd===1?'':'s'));
    if(gone.length)did.push(gone.length+' photo'+(gone.length===1?'':'s')+' removed');
    if(capN)did.push('captions');
    PUB=ents.map(function(e){return{src:e.src,cap:e.caption,orig:e.caption,removed:false}});
    local=[];dropAllDrafts();try{localStorage.removeItem(photoKey)}catch(e){}
   }
   var what=did.length>1?did.slice(0,-1).join(', ')+' and '+did[did.length-1]:did[0];
   say('Saved '+what+' into the repo folder. Commit and push to publish.');
  }catch(e){say('Saving failed: '+(e&&e.message?e.message:e))}
 });

 /* ---- zip download (for browsers that cannot write to a folder) ---- */
 var CRC=(function(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
 function crc32(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
 function zip(files){
  var enc=new TextEncoder(),parts=[],cd=[],off=0,cdSize=0;
  files.forEach(function(f){
   var nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
   var lh=new DataView(new ArrayBuffer(30));
   lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(12,0x21,true);
   lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nm.length,true);
   parts.push(new Uint8Array(lh.buffer),nm,f.data);
   var ch=new DataView(new ArrayBuffer(46));
   ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(14,0x21,true);
   ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
   cd.push(new Uint8Array(ch.buffer),nm);off+=30+nm.length+sz;
  });
  cd.forEach(function(p){cdSize+=p.length});
  var end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cdSize,true);end.setUint32(16,off,true);
  return new Blob(parts.concat(cd,[new Uint8Array(end.buffer)]),{type:'application/zip'});
 }
 exportBtn.addEventListener('click',async function(){
  var kept=PUB.filter(function(p){return !p.removed}).map(function(p){return{src:p.src,caption:p.cap}});
  var n=Math.max.apply(null,PUB.map(function(p){return +((p.src.match(/(\d+)\.\w+$/)||[0,0])[1])}).concat([0]));
  var files=[],ents=kept.slice();
  for(var i=0;i<local.length;i++){
   n++;var name=DIR+'photo-'+(n<10?'0':'')+n+'.jpg';
   files.push({name:name,data:new Uint8Array(await local[i].blob.arrayBuffer())});ents.push({src:name,caption:(local[i].cap||'').trim()});
  }
  files.push({name:DIR+'photos.js',data:new TextEncoder().encode(manifestText(ents))});
  var a=document.createElement('a');a.href=URL.createObjectURL(zip(files));a.download=slug+'-photos.zip';
  body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
 });

 /* ---- start: read the list of published photos, then show them ---- */
 function start(){
  PUB=((window.JOURNAL_PHOTOS||{})[slug]||[]).map(function(x){
   var src=typeof x==='string'?x:x.src,c=(typeof x==='string'?'':x.caption)||'';return{src:src,cap:c,orig:c,removed:false};
  });
  if(LOCAL)try{
   var pdr=JSON.parse(localStorage.getItem(photoKey)||'null');
   if(pdr)PUB.forEach(function(p){
    if(pdr.r&&pdr.r.indexOf(p.src)>=0)p.removed=true;
    if(pdr.c&&Object.prototype.hasOwnProperty.call(pdr.c,p.src))p.cap=String(pdr.c[p.src]);
   });
  }catch(e){}
  render();
  if(LOCAL)openDb().then(function(d){db=d;return tx('readonly',function(s){return s.getAll()})}).then(function(rows){
   local=(rows||[]).filter(function(r){return r.slug===slug}).sort(function(a,b){return a.id-b.id});render();
  }).catch(function(){render()});
 }
 var sc=document.createElement('script');
 sc.src=DIR+'photos.js'+(LOCAL?'?t='+Date.now():'');
 sc.onload=sc.onerror=start;document.head.appendChild(sc);
}

if(body.classList.contains('contents'))initRail();
var slug=body.getAttribute('data-photos');
if(slug)initPhotos(slug);
})();
