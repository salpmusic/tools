(function(){
  function $(s,r){return (r||document).querySelector(s)}
  function initViewer(root){
    var wrap = root.querySelector('.viewer');
    if(!wrap) return;
    var svg = wrap.querySelector('svg');
    if(!svg) return;
    var scale=1, tx=0, ty=0, min=0.35, max=4;
    var pointers=new Map();
    var lastDist=0, panning=false, px=0, py=0;

    function apply(){
      svg.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
    }
    function fit(){
      var vb=svg.viewBox.baseVal;
      var rw=wrap.clientWidth, rh=wrap.clientHeight;
      if(!vb.width||!vb.height||!rw||!rh) return;
      scale=Math.min(rw/vb.width, rh/vb.height)*0.92;
      tx=(rw-vb.width*scale)/2;
      ty=(rh-vb.height*scale)/2;
      apply();
    }
    function reset(){fit()}
    function zoomAt(factor, cx, cy){
      var ns=Math.min(max, Math.max(min, scale*factor));
      var k=ns/scale;
      tx=cx-(cx-tx)*k;
      ty=cy-(cy-ty)*k;
      scale=ns;
      apply();
    }

    wrap.addEventListener('wheel', function(e){
      e.preventDefault();
      var r=wrap.getBoundingClientRect();
      zoomAt(e.deltaY<0?1.12:1/1.12, e.clientX-r.left, e.clientY-r.top);
    }, {passive:false});

    wrap.addEventListener('pointerdown', function(e){
      wrap.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===1){panning=true;px=e.clientX;py=e.clientY}
      if(pointers.size===2){
        var arr=[...pointers.values()];
        lastDist=Math.hypot(arr[0].x-arr[1].x, arr[0].y-arr[1].y);
        panning=false;
      }
    });
    wrap.addEventListener('pointermove', function(e){
      if(!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){
        var arr=[...pointers.values()];
        var dist=Math.hypot(arr[0].x-arr[1].x, arr[0].y-arr[1].y);
        if(lastDist>0){
          var r=wrap.getBoundingClientRect();
          var cx=(arr[0].x+arr[1].x)/2-r.left;
          var cy=(arr[0].y+arr[1].y)/2-r.top;
          zoomAt(dist/lastDist, cx, cy);
        }
        lastDist=dist;
      } else if(panning && pointers.size===1){
        tx+=e.clientX-px; ty+=e.clientY-py; px=e.clientX; py=e.clientY; apply();
      }
    });
    function endPtr(e){
      pointers.delete(e.pointerId);
      if(pointers.size<2) lastDist=0;
      if(pointers.size===0) panning=false;
    }
    wrap.addEventListener('pointerup', endPtr);
    wrap.addEventListener('pointercancel', endPtr);

    var zin=$('#zoomIn'), zout=$('#zoomOut'), fitB=$('#fitView'), resetB=$('#resetView');
    var sel=$('#lineSelect'), clearB=$('#clearHighlight');
    if(zin) zin.onclick=function(){zoomAt(1.2, wrap.clientWidth/2, wrap.clientHeight/2)};
    if(zout) zout.onclick=function(){zoomAt(1/1.2, wrap.clientWidth/2, wrap.clientHeight/2)};
    if(fitB) fitB.onclick=fit;
    if(resetB) resetB.onclick=reset;
    function clearHot(){
      wrap.classList.remove('dim');
      svg.querySelectorAll('.is-hot').forEach(function(n){n.classList.remove('is-hot')});
    }
    if(clearB) clearB.onclick=function(){ if(sel) sel.value=''; clearHot(); };
    if(sel) sel.onchange=function(){
      clearHot();
      var v=sel.value; if(!v) return;
      wrap.classList.add('dim');
      svg.querySelectorAll('[data-line="'+v+'"]').forEach(function(n){n.classList.add('is-hot')});
    };

    // large text from home
    try{
      if(localStorage.getItem('salpView')==='large' || /(?:^|[?&])view=large(?:&|$)/.test(location.search)){
        document.body.classList.add('large');
      }
    }catch(e){}

    window.addEventListener('resize', function(){ /* keep transform */ });
    // load SVG if data-src
    var src=wrap.getAttribute('data-src');
    if(src && !svg){/* placeholder */}
    if(svg && svg.querySelector('rect')){
      // if dark, tweak bg
      if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
        var bg=svg.querySelector('rect');
        if(bg) bg.setAttribute('fill','#0f172a');
        svg.querySelectorAll('text').forEach(function(t){
          if(t.getAttribute('fill')==='#0f172a') t.setAttribute('fill','#e5eefc');
          if(t.getAttribute('fill')==='#64748b') t.setAttribute('fill','#94a3b8');
        });
        svg.querySelectorAll('circle').forEach(function(c){
          if(c.getAttribute('stroke')==='#0f172a') c.setAttribute('stroke','#e5eefc');
        });
      }
    }
    fit();
  }

  function loadInlineSvg(el, url, cb){
    fetch(url).then(function(r){return r.text()}).then(function(t){
      el.innerHTML=t;
      cb && cb();
    }).catch(function(){
      el.innerHTML='<p style="padding:16px">路線図の読み込みに失敗しました。</p>';
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    var viewer=$('.viewer');
    if(!viewer) return;
    var src=viewer.getAttribute('data-src');
    if(src){
      loadInlineSvg(viewer, src, function(){ initViewer(document); });
    } else {
      initViewer(document);
    }
  });
})();
