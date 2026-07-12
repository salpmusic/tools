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
  const RECENT_KEY="salpColorV52_recent";
  let recentPlayed=Storage.load(RECENT_KEY,[]);

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
    return [...remotePuzzles,...builtIn,...myPuzzles];
  }

  function updateStats(){
    $("statPuzzles").textContent=allPuzzles().length;
    $("statCompleted").textContent=completed.length;
    $("statFavorites").textContent=favorites.length;
  }

  function categoryInfo(category){
    const map={
      dog:{icon:"🐶",label:"犬"},
      cat:{icon:"🐱",label:"猫"},
      sweets:{icon:"🍰",label:"スイーツ"},
      flower:{icon:"🌸",label:"花"},
      salp:{icon:"🎨",label:"salp"},
      my:{icon:"📷",label:"自分の問題"}
    };
    return map[category]||{icon:"🧩",label:"その他"};
  }

  function difficultyStars(value){
    const normalized=String(value||"Normal").toLowerCase();
    const count=
      normalized==="easy"?1:
      normalized==="hard"?3:
      normalized==="expert"?4:
      2;
    return "★".repeat(count)+"☆".repeat(4-count);
  }

  function isNewItem(item){
    if(!item.created)return false;
    const created=new Date(item.created+"T00:00:00");
    if(Number.isNaN(created.getTime()))return false;
    return (Date.now()-created.getTime())/(1000*60*60*24)<=7;
  }

  function makeThumb(item,className="thumb"){
    let thumb;

    if(item.image){
      thumb=document.createElement("img");
      thumb.className=className;
      thumb.alt=item.title;
      thumb.loading="lazy";
      thumb.src=`${item.image}${item.image.includes("?")?"&":"?"}v=5.2.0`;

      thumb.addEventListener("error",()=>{
        const fallback=document.createElement("canvas");
        fallback.className=className;
        Library.drawPuzzleThumb(fallback,item.puzzle);
        thumb.replaceWith(fallback);
      });
    }else{
      thumb=document.createElement("canvas");
      thumb.className=className;
      Library.drawPuzzleThumb(thumb,item.puzzle);
    }

    return thumb;
  }

  function makePuzzleCard(item){
    const card=document.createElement("article");
    card.className="card";

    const imageFrame=document.createElement("div");
    imageFrame.className="imageFrame";
    imageFrame.appendChild(makeThumb(item));

    if(isNewItem(item)){
      const badge=document.createElement("span");
      badge.className="cardBadge";
      badge.textContent="NEW";
      imageFrame.appendChild(badge);
    }

    const body=document.createElement("div");
    body.className="cardBody";

    const title=document.createElement("div");
    title.className="cardTitle";
    title.textContent=item.title;

    const info=categoryInfo(item.category);
    const category=document.createElement("span");
    category.className="categoryLabel";
    category.textContent=`${info.icon} ${info.label}`;

    const difficulty=document.createElement("div");
    difficulty.className="difficulty";
    difficulty.textContent=`${difficultyStars(item.difficulty)} ${item.difficulty||"Normal"}`;

    const meta=document.createElement("div");
    meta.className="cardMeta";
    meta.textContent=`${item.puzzle.size}×${item.puzzle.size}・${Object.keys(item.puzzle.colors).length}色`;

    const actions=document.createElement("div");
    actions.className="cardActions";

    const play=document.createElement("button");
    play.className="primary";
    play.textContent="▶ 遊ぶ";
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
    body.append(title,category,difficulty,meta,actions);
    card.append(imageFrame,body);
    return card;
  }

  function renderFeatured(items){
    const holder=$("todayPick");
    holder.innerHTML="";

    if(!items.length){
      $("todaySection").classList.add("hidden");
      return;
    }

    $("todaySection").classList.remove("hidden");
    const item=items[new Date().getDate()%items.length];

    const card=document.createElement("article");
    card.className="featuredCard";
    card.appendChild(makeThumb(item));

    const body=document.createElement("div");
    body.className="featuredBody";

    const info=categoryInfo(item.category);
    const title=document.createElement("h3");
    title.textContent=item.title;

    const text=document.createElement("p");
    text.textContent=`${info.icon} ${info.label}・${item.puzzle.size}×${item.puzzle.size}・${Object.keys(item.puzzle.colors).length}色`;

    const difficulty=document.createElement("div");
    difficulty.className="difficulty";
    difficulty.textContent=`${difficultyStars(item.difficulty)} ${item.difficulty||"Normal"}`;

    const actions=document.createElement("div");
    actions.className="cardActions";

    const play=document.createElement("button");
    play.className="primary";
    play.textContent="▶ 今日の問題を遊ぶ";
    play.addEventListener("click",()=>startPuzzle(item));

    actions.appendChild(play);
    body.append(title,text,difficulty,actions);
    card.appendChild(body);
    holder.appendChild(card);
  }

  function renderRecent(){
    const holder=$("recentGrid");
    holder.innerHTML="";

    const recentItems=recentPlayed
      .map(id=>allPuzzles().find(item=>item.id===id))
      .filter(Boolean)
      .slice(0,4);

    $("recentSection").classList.toggle("hidden",recentItems.length===0);

    recentItems.forEach(item=>{
      const card=document.createElement("article");
      card.className="compactCard";
      card.appendChild(makeThumb(item));

      const body=document.createElement("div");
      body.className="compactBody";

      const title=document.createElement("div");
      title.className="compactTitle";
      title.textContent=item.title;

      body.appendChild(title);
      card.appendChild(body);
      card.addEventListener("click",()=>startPuzzle(item));
      holder.appendChild(card);
    });
  }

  function renderLibrary(){
    const query=$("searchInput").value.trim().toLowerCase();
    const filter=$("categoryFilter").value;

    const list=allPuzzles().filter(item=>{
      const matchQuery=!query||item.title.toLowerCase().includes(query);
      let matchFilter=true;

      if(filter==="built-in"){
        matchFilter=item.source==="built-in"||item.source==="remote";
      }else if(filter==="my"){
        matchFilter=item.source==="my";
      }else if(filter==="favorite"){
        matchFilter=favorites.includes(item.id);
      }else if(filter!=="all"){
        matchFilter=item.category===filter;
      }

      return matchQuery&&matchFilter;
    });

    $("libraryCount").textContent=`${list.length}問`;

    const grid=$("libraryGrid");
    grid.innerHTML="";

    renderFeatured(allPuzzles().filter(item=>item.source!=="my"));
    renderRecent();

    if(!list.length){
      grid.innerHTML='<div class="empty">該当する問題がありません。</div>';
      return;
    }

    list.forEach(item=>{
      grid.appendChild(makePuzzleCard(item));
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

    recentPlayed=[
      item.id,
      ...recentPlayed.filter(id=>id!==item.id)
    ].slice(0,12);

    Storage.save(RECENT_KEY,recentPlayed);

    $("gameTitle").textContent=item.title;
    Game.start(item,progressMap[item.id]);
    enableGame(true);
    switchScreen("game");
    $("message").textContent="色を選んで塗ってください";
  }

  $("searchInput").addEventListener("input",renderLibrary);
  $("categoryFilter").addEventListener("change",()=>{
    document.querySelectorAll("[data-category]").forEach(button=>{
      button.classList.toggle(
        "active",
        button.dataset.category===$("categoryFilter").value
      );
    });
    renderLibrary();
  });

  document.querySelectorAll("[data-category]").forEach(button=>{
    button.addEventListener("click",()=>{
      $("categoryFilter").value=button.dataset.category;

      document.querySelectorAll("[data-category]").forEach(item=>{
        item.classList.toggle("active",item===button);
      });

      renderLibrary();
    });
  });

  async function refreshRemoteLibrary(showAlert=false){
    const button=$("refreshRemoteBtn");

    if(button){
      button.disabled=true;
      button.textContent="更新中…";
    }

    try{
      remotePuzzles=await Library.loadRemoteIndex();
      renderLibrary();
      updateStats();

      if(showAlert){
        alert(`${remotePuzzles.length}問を読み込みました`);
      }
      return true;
    }catch(error){
      console.warn("問題ライブラリ読込エラー:",error);

      if(showAlert){
        alert(
          "問題ライブラリを読み込めませんでした。\n"+
          "library/index.json と puzzles 内のファイル名を確認してください。"
        );
      }
      return false;
    }finally{
      if(button){
        button.disabled=false;
        button.textContent="オンライン問題を更新";
      }
    }
  }

  $("refreshRemoteBtn").addEventListener("click",()=>{
    refreshRemoteLibrary(true);
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

  // 起動時に library/index.json を自動読込
  refreshRemoteLibrary(false);
})();
