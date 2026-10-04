/* salp Tools: スワイプモード
   ホームの a.open カード / 日記の部屋(a.roomCard) / クイックボタンから対象を自動収集し、
   全画面ビューアで iframe を次々切り替えて使えるモード。
   - 切替は専用バー(下部)・上部タイトル・◀▶・キー・一覧のみ。iframe 内のタッチ/ドラッグには一切触れない。
   - 現在 ±1 だけ読み込み、それ以外の iframe は破棄(音声・タイマーを残さない)。
   - #swipe=<相対パス> で直接開ける。戻る操作でホームへ戻る。 */
(()=>{
"use strict";
if(window.top!==window) return; /* iframe 内(ビューア自身の入れ子)では何もしない */
try{
const CANON="https://salpmusic.github.io/tools/";
const LS="salpSwipeLast_v1";
const BASE=new URL("./",location.href);
const ANIM=260;
const NOPRELOAD=/(^|\/)(salp-linux|terminal|chat)(\/|\.|$)/; /* 重いもの・ログイン系は隣で先読みしない(表示時に読む) */
const L={
ja:{entry:"スワイプモードへ切り替え",entrySub:"アプリ・ゲーム・ツールをスワイプで次々に切り替え",close:"✕ ホームに戻る",hint:"◀ ここを左右にスワイプ ▶",prev:"前のアプリ",next:"次のアプリ",list:"一覧から選ぶ",ext:"別タブで開く",loading:"読み込み中…",gDiary:"🐈 ふわふわ日記の部屋",gMore:"その他",listTitle:"アプリ一覧（タップでジャンプ）",lclose:"閉じる"},
en:{entry:"Switch to Swipe Mode",entrySub:"Swipe through all apps, games and tools",close:"✕ Back to Home",hint:"◀ Swipe here ▶",prev:"Previous app",next:"Next app",list:"Choose from list",ext:"Open in new tab",loading:"Loading…",gDiary:"🐈 Fluffy Diary rooms",gMore:"More",listTitle:"All apps (tap to jump)",lclose:"Close"},
vi:{entry:"Chuyển sang chế độ vuốt",entrySub:"Vuốt để chuyển qua mọi ứng dụng, trò chơi và công cụ",close:"✕ Về trang chủ",hint:"◀ Vuốt ngang tại đây ▶",prev:"Ứng dụng trước",next:"Ứng dụng sau",list:"Chọn từ danh sách",ext:"Mở trong tab mới",loading:"Đang tải…",gDiary:"🐈 Các phòng Nhật ký bông xù",gMore:"Khác",listTitle:"Tất cả ứng dụng (chạm để chuyển)",lclose:"Đóng"},
tl:{entry:"Lumipat sa Swipe Mode",entrySub:"I-swipe ang lahat ng app, laro at tool",close:"✕ Balik sa Home",hint:"◀ Mag-swipe dito ▶",prev:"Nakaraang app",next:"Susunod na app",list:"Pumili sa listahan",ext:"Buksan sa bagong tab",loading:"Naglo-load…",gDiary:"🐈 Mga kuwarto ng Fluffy Diary",gMore:"Iba pa",listTitle:"Lahat ng app (i-tap para lumipat)",lclose:"Isara"}
};
const lang=()=>{const l=(document.documentElement.lang||"ja").toLowerCase().split("-")[0];return L[l]?l:"ja"};
const t=k=>L[lang()][k];
const txt=e=>e?(e.textContent||"").replace(/\s+/g," ").trim():"";
const reduce=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 収集(自動生成) ---------- */
function norm(href){
  if(!href||href.charAt(0)==="#") return null;
  let u;
  try{ if(href.indexOf(CANON)===0) href="./"+href.slice(CANON.length); u=new URL(href,BASE); }catch(e){ return null; }
  if(u.origin!==BASE.origin||u.pathname.indexOf(BASE.pathname)!==0) return null;
  if(/\.(apk|zip|pdf|exe|dmg|mp3|wav|mp4|webm)$/i.test(u.pathname)) return null;
  const key=u.pathname.slice(BASE.pathname.length)+u.search;
  if(key===""||key==="index.html") return null;
  return {key:key,url:u.href};
}
function collect(){
  const items=[],seen=new Set();
  const add=(a,group,iconFn,nameFn)=>{
    if(a.hasAttribute("download")||a.target==="_blank") return;
    const n=norm(a.getAttribute("href")); if(!n||seen.has(n.key)) return;
    seen.add(n.key); items.push({key:n.key,url:n.url,group:group,icon:iconFn,name:nameFn});
  };
  document.querySelectorAll("#diaryRooms a.roomCard").forEach(a=>add(a,"diary",()=>"",()=>txt(a.querySelector("strong"))));
  document.querySelectorAll("a.open").forEach(a=>{
    if(a.closest("#salpFinderResults")) return;
    const c=a.closest(".card"); if(!c) return;
    const s=a.closest("section"); 
    add(a,(s&&s.id)||"more",()=>txt(c.querySelector(".icon")),()=>txt(c.querySelector("h3"))||txt(a));
  });
  document.querySelectorAll(".quickGrid a.quickButton").forEach(a=>add(a,"more",()=>txt(a.querySelector(".quickIcon")),()=>txt(a.querySelector("strong"))));
  return items;
}
function groupName(g){
  if(g==="diary") return t("gDiary");
  if(g==="more") return t("gMore");
  const h=document.querySelector("#"+g+" .sectionHead h2")||document.querySelector("#"+g+" h2");
  return txt(h)||g;
}

/* ---------- 状態 ---------- */
let items=[],cur=0,isOpen=false,pushed=false,pushLen=0,savedY=0,V=null,settleT=0,preT=0,dragging=false,inerted=[];
const panes=new Map(); /* key -> {el,item,iframe} */
const n=()=>items.length;
const mod=i=>((i%n())+n())%n();

/* ---------- ビューアDOM ---------- */
function mk(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function build(){
  if(V) return V;
  const o=mk("div","", 
    '<div class="ssTop"><button class="ssClose" type="button"></button><button class="ssTitle" type="button" aria-haspopup="dialog"><span class="ssName"></span><span class="ssPos"></span></button><button class="ssExt" type="button">↗</button></div>'+
    '<div class="ssStage"></div>'+
    '<div class="ssBottom"><button class="ssPrev" type="button">◀</button><div class="ssBar"><span class="ssGrip"></span><span class="ssHint"></span></div><button class="ssNext" type="button">▶</button></div>'+
    '<div class="ssList" hidden><div class="ssListBox" role="dialog"><div class="ssListHead"><strong></strong><button class="ssListClose" type="button">✕</button></div><div class="ssListBody"></div></div></div>');
  o.id="salpSwipe"; o.hidden=true; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true"); o.tabIndex=-1;
  const q=s=>o.querySelector(s);
  V={o:o,top:q(".ssTop"),close:q(".ssClose"),title:q(".ssTitle"),name:q(".ssName"),pos:q(".ssPos"),ext:q(".ssExt"),stage:q(".ssStage"),
     prev:q(".ssPrev"),next:q(".ssNext"),bar:q(".ssBar"),hint:q(".ssHint"),list:q(".ssList"),listHead:q(".ssListHead strong"),listClose:q(".ssListClose"),listBody:q(".ssListBody")};
  document.body.appendChild(o);
  V.close.addEventListener("click",()=>userClose());
  V.prev.addEventListener("click",()=>step(-1));
  V.next.addEventListener("click",()=>step(1));
  V.ext.addEventListener("click",()=>{const it=items[cur];if(it)window.open(it.url,"_blank","noopener")});
  V.title.addEventListener("click",e=>{if(V.suppressClick){V.suppressClick=false;return}openList()});
  V.listClose.addEventListener("click",closeList);
  V.list.addEventListener("click",e=>{if(e.target===V.list)closeList()});
  attachSwipe(V.bar); attachSwipe(V.title);
  return V;
}
function labels(){
  if(!V) return;
  V.close.textContent=t("close"); V.hint.textContent=t("hint");
  V.prev.setAttribute("aria-label",t("prev")); V.next.setAttribute("aria-label",t("next"));
  V.ext.setAttribute("aria-label",t("ext")); V.ext.title=t("ext");
  V.title.setAttribute("aria-label",t("list")); V.listHead.textContent=t("listTitle"); V.listClose.setAttribute("aria-label",t("lclose"));
  const it=items[cur];
  if(it){ const ic=it.icon(); V.name.textContent=(ic?ic+" ":"")+it.name(); V.pos.textContent=(cur+1)+" / "+n()+" ▾"; }
  panes.forEach(p=>{fillSplash(p)});
  if(!V.list.hidden) buildList();
}

/* ---------- ペイン(iframe) ---------- */
function fillSplash(p){
  p.el.querySelector(".ssSplashIcon").textContent=p.item.icon();
  p.el.querySelector(".ssSplashName").textContent=p.item.name();
  p.el.querySelector(".ssSplashMsg").textContent=t("loading");
}
function setOff(p,o){p.off=o;p.el.style.setProperty("--o",String(o))}
function loadFrame(p){
  if(p.iframe) return;
  const f=document.createElement("iframe");
  f.setAttribute("allow","autoplay; fullscreen; microphone; camera; clipboard-write; gamepad; accelerometer; gyroscope; screen-wake-lock; web-share");
  f.setAttribute("allowfullscreen","");
  f.title=p.item.name();
  f.addEventListener("load",()=>{
    const s=p.el.querySelector(".ssSplash"); if(s) s.style.display="none";
    try{ /* アプリ側がホームへ戻るリンクを持っていたら、ビューアごとホームへ戻る */
      const w=f.contentWindow; if(!w||w.location.href==="about:blank") return;
      const pn=w.location.pathname;
      if(pn===BASE.pathname||pn===BASE.pathname+"index.html"){ if(isOpen&&panes.get(p.item.key)===p&&p.item===items[cur]) userClose(); }
    }catch(e){}
  });
  f.src=p.item.url;
  p.el.appendChild(f); p.iframe=f;
}
function ensurePane(i,load){
  const item=items[i]; let p=panes.get(item.key);
  if(!p){
    const el=mk("div","ssPane",'<div class="ssSplash"><span class="ssSplashIcon"></span><b class="ssSplashName"></b><span class="ssSplashMsg"></span></div>');
    p={el:el,item:item,iframe:null,off:0};
    panes.set(item.key,p); V.stage.appendChild(el); fillSplash(p);
    setOff(p,i===cur?0:(i===mod(cur+1)?1:-1));
  }
  if(load) loadFrame(p);
  return p;
}
function destroy(p){
  if(p.iframe){ try{p.iframe.src="about:blank"}catch(e){} p.iframe.remove(); p.iframe=null; }
  p.el.remove(); panes.delete(p.item.key);
}
function prune(){
  const keep=new Set([items[cur].key]);
  if(n()>1){keep.add(items[mod(cur+1)].key);keep.add(items[mod(cur-1)].key)}
  Array.from(panes.values()).forEach(p=>{ if(!keep.has(p.item.key)) destroy(p); });
  const nx=mod(cur+1), pv=mod(cur-1);
  panes.forEach(p=>{
    const i=items.indexOf(p.item);
    const o=i===cur?0:(i===nx?1:-1);
    if(p.off!==o) setOff(p,o);
  });
}
function settle(){
  clearTimeout(settleT); settleT=0;
  if(!V) return;
  V.stage.classList.remove("ssAnim");
  if(!isOpen||!n()) return;
  prune();
  clearTimeout(preT);
  preT=setTimeout(preload,350);
}
function preload(){
  if(!isOpen||!n()||dragging) return;
  ensurePane(cur,true);
  if(n()>1){
    [mod(cur+1),mod(cur-1)].forEach(i=>{ const p=ensurePane(i,false); if(!NOPRELOAD.test(items[i].key)) loadFrame(p); });
  }
}

/* ---------- 切替 ---------- */
function persist(){
  const it=items[cur]; if(!it) return;
  try{localStorage.setItem(LS,it.key)}catch(e){}
  try{ history.replaceState(history.state,"",hashFor(it.key)); }catch(e){}
}
function hashFor(k){return location.pathname+location.search+"#swipe="+encodeURIComponent(k).replace(/%2F/gi,"/")}
function goTo(ni,dir){
  if(!isOpen||!n()) return;
  ni=mod(ni);
  if(V.stage.classList.contains("ssAnim")||settleT) settle();
  if(ni===cur){ snapBack(); return; }
  const old=ensurePane(cur,true), np=ensurePane(ni,true);
  if(!dir) dir=ni>cur?1:-1;
  if(np.off!==dir){ V.stage.classList.remove("ssAnim"); setOff(np,dir); void V.stage.offsetWidth; }
  const anim=!reduce();
  if(anim) V.stage.classList.add("ssAnim");
  V.stage.style.setProperty("--dx","0px");
  setOff(old,-dir); setOff(np,0);
  cur=ni; persist(); labels();
  if(anim) settleT=setTimeout(settle,ANIM+60); else settle();
}
function step(d){ goTo(cur+d,d) }
function snapBack(){
  if(!V) return;
  if(!reduce()) V.stage.classList.add("ssAnim");
  V.stage.style.setProperty("--dx","0px");
  clearTimeout(settleT); settleT=setTimeout(settle,ANIM+60);
}

/* ---------- スワイプ判定(専用バー限定) ---------- */
function attachSwipe(el){
  let st=null;
  el.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0) return;
    st={id:e.pointerId,x:e.clientX,t:performance.now(),dir:0,moved:false};
  });
  el.addEventListener("pointermove",e=>{
    if(!st||e.pointerId!==st.id) return;
    const dx=e.clientX-st.x;
    if(!st.moved){
      if(Math.abs(dx)<8) return;
      st.moved=true; dragging=true;
      try{el.setPointerCapture(e.pointerId)}catch(_){}
      if(V.stage.classList.contains("ssAnim")||settleT) settle();
      clearTimeout(preT);
    }
    const dir=dx<0?1:-1; /* 左へドラッグ=次へ */
    if(n()>1&&dir!==st.dir){
      st.dir=dir;
      const ti=mod(cur+dir), np=ensurePane(ti,true);
      V.stage.classList.remove("ssAnim");
      if(np.off!==dir){ setOff(np,dir); }
      /* 反対側に同じペインが居る(2件のみ)場合の取り違え防止は上の setOff で解決 */
    }
    const W=V.stage.clientWidth||1;
    V.stage.style.setProperty("--dx",Math.max(-W,Math.min(W,dx))+"px");
  });
  const end=(e,cancel)=>{
    if(!st||e.pointerId!==st.id) return;
    const s=st; st=null;
    try{el.releasePointerCapture(e.pointerId)}catch(_){}
    if(!s.moved) return;
    dragging=false;
    if(el===V.title) V.suppressClick=true, setTimeout(()=>{V.suppressClick=false},0);
    const dx=e.clientX-s.x, dt=Math.max(1,performance.now()-s.t), v=Math.abs(dx)/dt;
    const W=V.stage.clientWidth||1;
    const go=!cancel&&n()>1&&(Math.abs(dx)>Math.min(70,W*0.2)||(v>0.45&&Math.abs(dx)>24));
    if(go) goTo(cur+(dx<0?1:-1),dx<0?1:-1); else snapBack();
  };
  el.addEventListener("pointerup",e=>end(e,false));
  el.addEventListener("pointercancel",e=>end(e,true));
  el.addEventListener("lostpointercapture",e=>{ if(e.target===el&&st&&e.pointerId===st.id) end(e,true); }); /* 子要素(implicit capture)由来の bubble は無視 */
}

/* ---------- 一覧 ---------- */
function buildList(){
  const b=V.listBody; b.textContent="";
  let g=null;
  items.forEach((it,i)=>{
    if(it.group!==g){ g=it.group; b.appendChild(mk("div","ssGroup")).textContent=groupName(g); }
    const bt=mk("button","ssItem"); bt.type="button"; bt.dataset.i=i;
    if(i===cur) bt.setAttribute("aria-current","true");
    const ic=mk("span","ssItemIcon"); ic.textContent=it.icon();
    const nm=mk("span","ssItemName"); nm.textContent=it.name();
    const no=mk("span","ssItemNo"); no.textContent=(i+1);
    bt.append(ic,nm,no);
    bt.addEventListener("click",()=>{closeList();goTo(i,i>cur?1:-1)});
    b.appendChild(bt);
  });
}
function openList(){ buildList(); V.list.hidden=false; const c=V.listBody.querySelector('[aria-current="true"]'); if(c) c.scrollIntoView({block:"center"}); const f=V.listClose; try{f.focus()}catch(e){} }
function closeList(){ if(V&&!V.list.hidden){ V.list.hidden=true; try{V.title.focus()}catch(e){} } }

/* ---------- 開閉 ---------- */
function setInert(on){
  if(on){
    inerted=[];
    Array.from(document.body.children).forEach(c=>{ if(c===V.o||c.tagName==="SCRIPT") return; if(!c.hasAttribute("inert")){ c.setAttribute("inert",""); inerted.push(c);} });
  }else{ inerted.forEach(c=>c.removeAttribute("inert")); inerted=[]; }
}
function openView(key,how){
  const list=collect(); if(!list.length) return false;
  items=list; build();
  let idx=key?items.findIndex(x=>x.key===key):-1;
  if(idx<0){ let last=null; try{last=localStorage.getItem(LS)}catch(e){} idx=last?items.findIndex(x=>x.key===last):-1; }
  if(idx<0) idx=0;
  if(!isOpen){
    savedY=window.scrollY||document.documentElement.scrollTop||0;
    isOpen=true; V.o.hidden=false;
    document.documentElement.classList.add("salpSwipeOn");
    setInert(true);
    if(how==="btn"){ try{history.pushState({salpSwipe:1},"",hashFor(items[idx].key)); pushed=true; pushLen=history.length;}catch(e){} }
    else if(how==="hash"){ try{history.replaceState({salpSwipe:1},"",hashFor(items[idx].key));}catch(e){} pushed=false; }
    else pushed=true; /* popstate(進む)で開いた場合は履歴に既にある */
  }
  Array.from(panes.values()).forEach(destroy);
  clearTimeout(settleT); clearTimeout(preT);
  V.stage.classList.remove("ssAnim"); V.stage.style.setProperty("--dx","0px");
  cur=idx; labels(); persist();
  const p=ensurePane(cur,true); setOff(p,0);
  preT=setTimeout(preload,350);
  try{V.o.focus({preventScroll:true})}catch(e){}
  return true;
}
function closeView(){
  if(!isOpen) return;
  isOpen=false; dragging=false;
  clearTimeout(settleT); clearTimeout(preT);
  closeList();
  Array.from(panes.values()).forEach(destroy);
  V.o.hidden=true;
  setInert(false);
  document.documentElement.classList.remove("salpSwipeOn");
  window.scrollTo(0,savedY);
  const b=document.getElementById("swipeEntryBtn"); if(b){try{b.focus({preventScroll:true})}catch(e){}}
}
function userClose(){
  if(!isOpen) return;
  /* 履歴が増えていない(アプリ内遷移なし)ときだけ back() で戻る。増えていたら back() は iframe 側を戻してしまうので直接閉じる */
  if(pushed&&history.length===pushLen&&history.state&&history.state.salpSwipe){ pushed=false; try{ history.back(); }catch(e){} setTimeout(()=>{ if(isOpen) closeView(); },400); }
  else { pushed=false; closeView(); try{ if(/^#swipe/.test(location.hash)) history.replaceState(null,"",location.pathname+location.search); }catch(e){} }
}
function parseHash(){ const m=/^#swipe(?:=(.*))?$/.exec(location.hash); if(!m) return null; let k=""; try{k=decodeURIComponent(m[1]||"")}catch(e){} return {key:k}; }
function onNav(){
  const h=parseHash();
  if(h){ if(!isOpen) openView(h.key,"pop"); else if(h.key){ const i=items.findIndex(x=>x.key===h.key); if(i>=0&&i!==cur) goTo(i,i>cur?1:-1); } }
  else if(isOpen){ pushed=false; closeView(); }
}
window.addEventListener("popstate",onNav);
window.addEventListener("hashchange",onNav);
document.addEventListener("keydown",e=>{
  if(!isOpen||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey) return;
  if(e.key==="Escape"){ e.preventDefault(); if(!V.list.hidden) closeList(); else userClose(); return; }
  if(!V.list.hidden) return;
  if(e.key==="ArrowLeft"){ e.preventDefault(); step(-1); }
  else if(e.key==="ArrowRight"){ e.preventDefault(); step(1); }
});

/* ---------- ホームのボタン ---------- */
function entryLabels(){
  const b=document.getElementById("swipeEntryBtn"); if(!b) return;
  const ti=b.querySelector(".swipeEntryTitle"), su=b.querySelector(".swipeEntrySub");
  if(ti) ti.textContent=t("entry"); if(su) su.textContent=t("entrySub");
}
function init(){
  const b=document.getElementById("swipeEntryBtn"); 
  if(b){
    entryLabels();
    b.addEventListener("click",()=>{ openView(null,"btn"); });
    const w=b.closest(".swipeEntryWrap"); if(w) w.hidden=false;
  }
  new MutationObserver(()=>{entryLabels();labels()}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  { const h=parseHash(); if(h) openView(h.key,"hash"); }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
}catch(err){ try{console.warn("swipe.js disabled:",err)}catch(e){} }
})();
