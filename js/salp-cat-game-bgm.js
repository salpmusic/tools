var SalpBGM=(function(){
  var KEY='salpToolsBgm_v1',VOL=0.35,EVS=['click','touchend','pointerup','keydown'];
  var L={ja:['BGM','BGM(音楽)'],vi:['Nhạc','Nhạc nền'],en:['Music','Background music'],tl:['Musika','Musika sa background']};
  var el=null,btn=null,tracks=[],bad={},idx=0,on=true,gest=false,armed=false,dead=false,want=false,hiddenPause=false,ac=null,gain=null,routed=false;
  function q(f){try{return f()}catch(e){}}
  function lang(){var l=(document.documentElement.lang||'ja').slice(0,2).toLowerCase();return L[l]?l:'ja'}
  function label(){
    if(!btn)return;var t=L[lang()];
    btn.textContent='🎵 '+t[0]+(on?' ON':' OFF');
    btn.setAttribute('aria-pressed',String(on));btn.setAttribute('aria-label',t[1]+(on?' ON':' OFF'));btn.title=t[1];
  }
  function volFixed(){var a=q(function(){var x=new Audio();x.volume=0.5;return x.volume});return a!==0.5}
  function route(){ /* iOS: volume が無視されるので Web Audio のゲインで絞る(ユーザー操作内で呼ぶ) */
    if(routed||!volFixed())return;routed=true;
    q(function(){
      var C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      ac=new C();gain=ac.createGain();gain.gain.value=VOL;gain.connect(ac.destination);
      ac.createMediaElementSource(el).connect(gain);
    });
  }
  function acResume(){if(ac&&ac.state!=='running')q(function(){var p=ac.resume();if(p&&p.catch)p.catch(function(){})})}
  function alive(){for(var i=0;i<tracks.length;i++)if(!bad[i])return true;return false}
  function kill(){dead=true;want=false;disarm();if(el)q(function(){el.pause();el.removeAttribute('src');el.load()});if(btn)btn.hidden=true}
  function load(i){idx=i;q(function(){el.src=tracks[i]})}
  function next(){
    for(var k=1;k<=tracks.length;k++){var j=(idx+k)%tracks.length;if(!bad[j]){load(j);return true}}
    return false;
  }
  function play(){
    if(dead||!on||!gest||document.hidden)return;
    want=true;acResume();
    var p=q(function(){return el.play()});
    if(p&&p.then)p.then(function(){disarm()},function(e){if(e&&e.name==='NotAllowedError')arm()});
  }
  function pause(){want=false;if(el)q(function(){el.pause()})}
  function onGesture(e){
    if(btn&&e&&e.target&&btn.contains&&btn.contains(e.target))return; /* 🎵ボタン自身はボタン側で処理 */
    if(e&&e.type==='keydown'&&(e.key==='Tab'||e.key==='Shift'||e.key==='Escape'))return;
    gest=true;
    if(!routed&&on)route();
    acResume();
    if(on&&el&&el.paused)play();else if(!on||!el||!el.paused)disarm();
  }
  function arm(){if(armed||dead)return;armed=true;EVS.forEach(function(t){document.addEventListener(t,onGesture,true)})}
  function disarm(){if(!armed)return;armed=false;EVS.forEach(function(t){document.removeEventListener(t,onGesture,true)})}
  function toggle(){
    on=!on;q(function(){localStorage.setItem(KEY,on?'1':'0')});label();
    if(on){gest=true;route();play()}else{pause();disarm()}
  }
  function init(o){
    q(function(){
      o=o||{};var id=o.id;if(!id||el)return;
      on=q(function(){return localStorage.getItem(KEY)})!=='0';
      tracks=['bgm/'+id+'_1.mp3'];
      el=new Audio();el.preload='none';el.loop=true;el.setAttribute('playsinline','');el.setAttribute('webkit-playsinline','');
      q(function(){el.volume=VOL});
      el.addEventListener('ended',function(){if(next())play();});
      el.addEventListener('error',function(){
        if(!el.getAttribute('src'))return;
        bad[idx]=true;
        if(!alive()){kill();return}
        next();if(want)play();
      });
      el.addEventListener('pause',function(){ /* iOS の割り込み等で止まった: 次の操作で再開できるようにする */
        if(want&&on&&!document.hidden&&!el.ended)arm();
      });
      load(0);
      var ref=o.after&&document.getElementById(o.after);
      btn=document.createElement('button');btn.type='button';btn.className=o.className||'tog';btn.id='tBgm';
      btn.addEventListener('click',toggle);
      if(ref&&ref.parentNode)ref.parentNode.insertBefore(btn,ref.nextSibling);
      label();
      q(function(){new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})});
      document.addEventListener('visibilitychange',function(){
        if(document.hidden){if(el&&(want||!el.paused)){hiddenPause=true;q(function(){el.pause()})}}
        else if(hiddenPause){hiddenPause=false;if(on&&want)play()}
      });
      window.addEventListener('pagehide',function(){if(el&&(want||!el.paused)){hiddenPause=true;q(function(){el.pause()})}});
      window.addEventListener('pageshow',function(e){if(e&&e.persisted&&hiddenPause&&!document.hidden){hiddenPause=false;if(on&&want)play()}});
      arm();
      /* http(s) では曲の有無を軽く確認し、1曲も無ければボタンごと隠す(file:// では再生時に判定) */
      if(/^https?:$/.test(location.protocol)&&window.fetch){
        var left=tracks.length;
        tracks.forEach(function(u,i){
          fetch(u,{method:'HEAD',cache:'no-cache'}).then(function(r){if(!r.ok)bad[i]=true},function(){bad[i]=true}).then(function(){
            if(--left===0){if(!alive())kill();else if(bad[idx])next()}
          });
        });
      }
    });
  }
  return {init:init,toggle:toggle,get on(){return on},get playing(){return !!(el&&!el.paused)},get track(){return idx},get disabled(){return dead},get el(){return el}};
})();
