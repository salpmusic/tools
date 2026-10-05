const $=id=>document.getElementById(id);
let engine,cx=null,send=null,failed=false,busy=false;
const decoder=new TextDecoder(),encoder=new TextEncoder();
const log=text=>{$('diagnostics').textContent+=text+'\n';};
function controls(enabled){for(const el of document.querySelectorAll('#inputForm input,#inputForm button,[data-key],[data-seq]'))el.disabled=!enabled;}
function fatal(error){failed=true;controls(false);$('boot').disabled=true;$('network').disabled=true;window.salpFatal('Linux実行エラー',error);log(error?.stack||String(error));}
window.addEventListener('error',e=>fatal(e.error||e.message));window.addEventListener('unhandledrejection',e=>fatal(e.reason));
$('reload').onclick=()=>location.reload();
try{$('image').value=localStorage.getItem('salp-reset01-image')||'';}catch(e){log('イメージ設定は保存できない環境です。URLは今回の起動に使用できます。');}
function write(text){const output=$('output');output.textContent+=text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g,'');if(output.textContent.length>100000)output.textContent=output.textContent.slice(-80000);output.scrollTop=output.scrollHeight;}
function input(text){if(send&&!failed)for(const byte of encoder.encode(text))send(byte);}
$('inputForm').onsubmit=e=>{e.preventDefault();input($('command').value+'\r');$('command').value='';$('command').focus();};
for(const b of document.querySelectorAll('[data-key]'))b.onclick=()=>{if(send&&!failed)send(Number(b.dataset.key));};
for(const b of document.querySelectorAll('[data-seq]'))b.onclick=()=>input('\x1b'+b.dataset.seq);
function fit(){const screen=$('screen');if(screen.hidden)return;const s=Math.min(screen.clientWidth/720,screen.clientHeight/1080);const c=$('display');c.style.width='720px';c.style.height='1080px';c.style.transform=`scale(${s})`;c.style.left=(screen.clientWidth-720*s)/2+'px';c.style.top=(screen.clientHeight-1080*s)/2+'px';}
new ResizeObserver(fit).observe($('screen'));
$('display').addEventListener('pointerdown',()=>$('display').focus({preventScroll:true}));
$('network').onclick=async()=>{if(!cx||failed)return;try{window.salpStage('Tailscaleログインを準備中');await cx.networkLogin();window.salpStage('Tailscale認証待ち','ログインリンクを開いてください');}catch(e){log('Network: '+e.message);$('netStatus').textContent='接続開始に失敗しました: '+e.message;}};
$('copy').onclick=async()=>{const report=[navigator.userAgent,'Reset v0.1 / CheerpX 1.3.5 / '+$('mode').value,'isolated='+crossOriginIsolated,$('status').textContent,$('diagnostics').textContent,$('output').textContent].join('\n');try{await navigator.clipboard.writeText(report);$('copy').textContent='コピーしました';}catch(_){const area=document.createElement('textarea');area.value=report;document.body.append(area);area.focus();area.select();}};
$('boot').onclick=async()=>{
 if(busy||cx||failed)return;busy=true;$('boot').disabled=true;$('mode').disabled=true;$('image').disabled=true;
 try{
  const gui=$('mode').value==='gui',url=$('image').value.trim();
  if(url){const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('イメージはHTTPSのURLを指定してください。');}
  try{localStorage.setItem('salp-reset01-image',url);}catch(e){log('イメージ設定の保存を省略します。Linux起動は続行します。');}
  window.salpStage('ディスクを接続中');log('Disk: '+(url||'Official Alpine'));
  const base=url?await engine.HttpBytesDevice.create(url):await engine.CloudDevice.create('wss://disks.webvm.io/alpine_20251007.ext2');
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(url||'official-alpine-20251007'));
  const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const disk=await engine.IDBDevice.create('salp-reset01-'+key);
  const overlay=await engine.OverlayDevice.create(base,disk);
  cx=await engine.Linux.create({mounts:[{type:'ext2',path:'/',dev:overlay},{type:'devs',path:'/dev'}],networkInterface:{loginUrlCb:url=>{$('login').href=url;$('login').hidden=false;},stateUpdateCb:state=>{$('netStatus').textContent=String(state);}}});
  send=cx.setCustomConsole(buf=>write(decoder.decode(buf,{stream:true})),60,24);
  const probe=await cx.run('/bin/sh',['-c','printf "SALP_LINUX_PROBE_OK\\n"'],{uid:0,gid:0});
  if(probe?.status!==0)throw new Error('Linuxコマンドの実行確認に失敗しました: '+JSON.stringify(probe));
  log('Linux command probe: exit 0');
  if(failed)return;
  $('network').disabled=false;
  if(gui){
   $('screen').hidden=false;fit();cx.setKmsCanvas($('display'),720,1080);
   log('KMS set once: 720x1080');window.salpStage('GUI起動を開始しました','画面の表示を確認してください');
   cx.run('/sbin/init',[],{uid:0,gid:0}).then(result=>{if(!failed){log('init exited: '+result.status);window.salpStage('GUI init終了',String(result.status));}},fatal);
  }else{
   controls(true);window.salpStage('Linuxコマンド実行確認済み','シェルを開始します');
   cx.run('/bin/ash',['-l'],{uid:1000,gid:1000,cwd:'/home/user',env:['HOME=/home/user','USER=user','SHELL=/bin/ash','TERM=dumb','LANG=C.UTF-8']}).then(result=>{if(!failed){controls(false);log('shell exited: '+result.status);window.salpStage('Linuxシェル終了',String(result.status));}},fatal);
  }
 }catch(e){fatal(e);}finally{busy=false;}
};
try{await window.salpRuntimeReady;engine=await import('https://cxrtnc.leaningtech.com/1.3.5/cx.esm.js');log(navigator.userAgent);window.salpStage('起動準備完了');$('boot').disabled=false;}catch(e){fatal(e);}
