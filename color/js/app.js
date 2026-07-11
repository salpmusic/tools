(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const Storage = window.SalpColorStorage;
  const Library = window.SalpColorLibrary;
  const ImageTools = window.SalpColorImage;
  const Game = window.SalpColorGame;

  let sourceImage=null;
  let builtIn=Library.createBuiltIns();
  let remotePuzzles=[];
  let myPuzzles=Storage.load(Storage.KEYS.my,[]);
  let favorites=Storage.load(Storage.KEYS.favorites,[]);
  let completed=Storage.load(Storage.KEYS.completed,[]);
  let progressMap=Storage.load(Storage.KEYS.progress,{});
  let current=null;

  Game.init($("gameCanvas"),{
    onRenderPalette:renderPalette,
    onProgress:percent=>{
      $("percentText").textContent=`${percent}%`;
      $("progressBar").style.width=`${percent}%`;
    },
    onSelection:(number,color)=>{
      $("selectedSwatch").style.backgroundColor=color||"transparent";
      $("selectedText").textContent=color?`${number}番の色を選択中`:"色を選んでください";
    },
    onZoom:zoom=>{
      $("zoomResetBtn").textContent=`${Math.round(zoom*100)}%`;
      $("canvasWrap").style.minHeight=Math.min($("gameCanvas").height*zoom,600)+"px";
    },
    onMessage:text=>$("message").textContent=text,
    onSaveProgress:(id,filled)=>{
      progressMap[id]=filled;
      Storage.save(Storage.KEYS.progress,progressMap);
    },
    onComplete:id=>{
      if(!completed.includes(id)){
        completed.push(id);
        Storage.save(Storage.KEYS.completed,completed);
        updateStats();
      }
      $("completeOverlay").classList.add("show");
    }
  });

  function switchScreen(id){
    document.querySelectorAll(".screen").forEach(screen=>{
      screen.classList.toggle("active",screen.id===id);
    });

    document.querySelectorAll("[data-screen]").forEach(button=>{
      button.classList.toggle("primary",button.dataset.screen===id);
    });

    if(id==="library")renderLibrary();
    if(id==="home")updateStats();
  }

  document.querySelectorAll("[data-screen]").forEach(button=>{
    button.addEventListener("click",()=>switchScreen(button.dataset.screen));
  });

  function allPuzzles(){
    return [...builtIn,...remotePuzzles,...myPuzzles];
  }

  function updateStats(){
    $("statPuzzles").textContent=allPuzzles().length;
    $("statCompleted").textContent=completed.length;
    $("statFavorites").textContent=favorites.length;
  }

  function renderLibrary(){
    const query=$("searchInput").value.trim().toLowerCase();
    const filter=$("categoryFilter").value;

    const list=allPuzzles().filter(item=>{
      const matchQuery=!query||item.title.toLowerCase().includes(query);
      let matchFilter=true;

      if(filter==="built-in")matchFilter=item.source==="built-in";
      else if(filter==="my")matchFilter=item.source==="my";
      else if(filter==="favorite")matchFilter=favorites.includes(item.id);
      else if(filter!=="all")matchFilter=item.category===filter;

      return matchQuery&&matchFilter;
    });

    const grid=$("libraryGrid");
    grid.innerHTML="";

    if(!list.length){
      grid.innerHTML='<div class="empty">該当する問題がありません。</div>';
      return;
    }

    list.forEach(item=>{
      const card=document.createElement("article");
      card.className="card";

      const thumb=document.createElement("canvas");
      thumb.className="thumb";
      Library.drawPuzzleThumb(thumb,item.puzzle);

      const body=document.createElement("div");
      body.className="cardBody";

      const title=document.createElement("div");
      title.className="cardTitle";
      title.textContent=item.title;

      const meta=document.createElement("div");
      meta.className="cardMeta";
      meta.textContent=`${item.puzzle.size}×${item.puzzle.size}・${Object.keys(item.puzzle.colors).length}色`;

      const actions=document.createElement("div");
      actions.className="cardActions";

      const play=document.createElement("button");
      play.className="primary";
      play.textContent="遊ぶ";
      play.addEventListener("click",()=>startPuzzle(item));

      const fav=document.createElement("button");
      fav.className="fav";
      fav.textContent=favorites.includes(item.id)?"❤️":"♡";
      fav.addEventListener("click",()=>{
        if(favorites.includes(item.id)){
          favorites=favorites.filter(id=>id!==item.id);
        }else{
          favorites.push(item.id);
        }
        Storage.save(Storage.KEYS.favorites,favorites);
        renderLibrary();
        updateStats();
      });

      actions.append(play,fav);
      body.append(title,meta,actions);
      card.append(thumb,body);
      grid.appendChild(card);
    });
  }

  function renderPalette(items){
    const container=$("palette");
    container.innerHTML="";

    items.forEach(item=>{
      const button=document.createElement("button");
      button.className="colorBtn";
      if(item.active)button.classList.add("active");

      const swatch=document.createElement("span");
      swatch.className="swatch";
      swatch.style.backgroundColor=item.color;

      const label=document.createElement("span");
      label.textContent=`${item.number}番 ${item.remaining===0?"完了":item.remaining}`;

      button.append(swatch,label);
      button.addEventListener("click",()=>Game.setSelectedColor(item.number));
      container.appendChild(button);
    });
  }

  function enableGame(enabled){
    ["hintBtn","fillColorBtn","resetBtn","savePngBtn"].forEach(id=>{
      $(id).disabled=!enabled;
    });
  }

  function startPuzzle(item){
    current=item;
    $("gameTitle").textContent=item.title;
    Game.start(item,progressMap[item.id]);
    enableGame(true);
    switchScreen("game");
    $("message").textContent="色を選んで塗ってください";
  }

  $("searchInput").addEventListener("input",renderLibrary);
  $("categoryFilter").addEventListener("change",renderLibrary);

  $("refreshRemoteBtn").addEventListener("click",async()=>{
    const button=$("refreshRemoteBtn");
    button.disabled=true;
    button.textContent="更新中…";

    try{
      remotePuzzles=await Library.loadRemoteIndex();
      renderLibrary();
      updateStats();
      alert(`${remotePuzzles.length}問を読み込みました`);
    }catch{
      alert("オンライン問題はまだありません。library/index.jsonを追加すると読み込めます。");
    }finally{
      button.disabled=false;
      button.textContent="オンライン問題を更新";
    }
  });

  $("imageInput").addEventListener("change",()=>{
    const file=$("imageInput").files[0];
    if(!file)return;

    const url=URL.createObjectURL(file);
    const image=new Image();

    image.onload=()=>{
      sourceImage=image;
      $("sourcePreview").src=url;
      $("generateBtn").disabled=false;
      if(!$("titleInput").value){
        $("titleInput").value=file.name.replace(/\.[^.]+$/,"");
      }
    };

    image.onerror=()=>{
      URL.revokeObjectURL(url);
      alert("画像を読み込めませんでした");
    };

    image.src=url;
  });

  $("generateBtn").addEventListener("click",async()=>{
    if(!sourceImage)return;

    const button=$("generateBtn");
    button.disabled=true;
    button.textContent="生成中…";

    try{
      const size=Number($("gridSize").value);
      const colorCount=Number($("colorCount").value);
      const puzzle=await ImageTools.createPuzzleFromImage(sourceImage,size,colorCount);
      const title=$("titleInput").value.trim()||"無題の作品";

      current={
        id:`temp-${Date.now()}`,
        title,
        category:$("creatorCategory").value,
        source:"temp",
        puzzle
      };

      $("saveToLibraryBtn").disabled=false;
      $("saveJsonBtn").disabled=false;
      startPuzzle(current);
      $("message").textContent="ぬりえができました！";
    }catch(error){
      alert("生成に失敗しました: "+error.message);
    }finally{
      button.disabled=false;
      button.textContent="ぬりえを作る";
    }
  });

  $("saveToLibraryBtn").addEventListener("click",()=>{
    if(!current)return;

    const item={
      ...current,
      id:`my-${Date.now()}`,
      source:"my",
      title:$("titleInput").value.trim()||current.title,
      category:$("creatorCategory").value
    };

    myPuzzles.unshift(item);
    Storage.save(Storage.KEYS.my,myPuzzles);
    current=item;
    $("saveToLibraryBtn").disabled=true;
    updateStats();
    alert("自分の問題へ保存しました");
  });

  $("deleteMyPuzzlesBtn").addEventListener("click",()=>{
    if(!confirm("自分の問題をすべて削除しますか？"))return;

    myPuzzles=[];
    Storage.save(Storage.KEYS.my,myPuzzles);
    renderLibrary();
    updateStats();
  });

  $("saveJsonBtn").addEventListener("click",()=>{
    if(!current)return;
    downloadBlob(
      `${current.title||"salp-color"}.json`,
      new Blob([JSON.stringify(current,null,2)],{type:"application/json"})
    );
  });

  $("jsonInput").addEventListener("change",async()=>{
    const file=$("jsonInput").files[0];
    if(!file)return;

    try{
      const data=JSON.parse(await file.text());
      const item=data.puzzle?data:{
        id:`import-${Date.now()}`,
        title:file.name.replace(/\.json$/i,""),
        category:"my",
        source:"temp",
        puzzle:data
      };

      current=item;
      startPuzzle(item);
    }catch(error){
      alert("読み込めませんでした: "+error.message);
    }

    $("jsonInput").value="";
  });

  $("hintBtn").addEventListener("click",()=>{
    if(!Game.showHint()){
      $("message").textContent="この色は全部塗れています";
    }else{
      $("message").textContent="黄色い枠を塗ってみよう";
    }
  });

  $("fillColorBtn").addEventListener("click",()=>{
    const count=Game.fillSelectedColor();
    $("message").textContent=`${count}マス塗りました`;
  });

  $("resetBtn").addEventListener("click",()=>{
    if(!confirm("最初からやり直しますか？"))return;
    Game.reset();
  });

  $("zoomInBtn").addEventListener("click",Game.zoomIn);
  $("zoomOutBtn").addEventListener("click",Game.zoomOut);
  $("zoomResetBtn").addEventListener("click",Game.zoomReset);

  $("numbersBtn").addEventListener("click",()=>{
    const visible=Game.toggleNumbers();
    $("numbersBtn").textContent=`番号表示 ${visible?"ON":"OFF"}`;
  });

  $("savePngBtn").addEventListener("click",()=>{
    const item=Game.getCurrent();
    if(!item)return;

    const out=document.createElement("canvas");
    const cellSize=8;
    out.width=item.puzzle.size*cellSize;
    out.height=item.puzzle.size*cellSize;
    const outputContext=out.getContext("2d");

    item.puzzle.data.forEach((value,index)=>{
      outputContext.fillStyle=item.puzzle.colors[value];
      outputContext.fillRect(
        (index%item.puzzle.size)*cellSize,
        Math.floor(index/item.puzzle.size)*cellSize,
        cellSize,
        cellSize
      );
    });

    out.toBlob(blob=>{
      if(blob)downloadBlob(`${item.title||"salp-color"}.png`,blob);
    },"image/png");
  });

  function downloadBlob(filename,blob){
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(()=>{
      URL.revokeObjectURL(url);
      link.remove();
    },1000);
  }

  $("closeCompleteBtn").addEventListener("click",()=>{
    $("completeOverlay").classList.remove("show");
  });

  updateStats();
  renderLibrary();
})();
