window.SalpColorGame = (() => {
  let canvas;
  let ctx;
  let current=null;
  let filled=[];
  let selectedColor=1;
  let zoom=1;
  let showNumbers=true;
  let hintIndex=-1;
  let callbacks={};

  function init(canvasElement,handlers={}){
    canvas=canvasElement;
    ctx=canvas.getContext("2d");
    callbacks=handlers;

    canvas.addEventListener("pointerdown",event=>{
      if(!current)return;

      const rect=canvas.getBoundingClientRect();
      const realX=(event.clientX-rect.left)/zoom;
      const realY=(event.clientY-rect.top)/zoom;
      const cellSize=canvas.width/current.puzzle.size;
      const column=Math.floor(realX/cellSize);
      const row=Math.floor(realY/cellSize);

      if(column<0||row<0||column>=current.puzzle.size||row>=current.puzzle.size)return;
      paintCell(row*current.puzzle.size+column);
    });
  }

  function start(item,savedProgress){
    current=item;
    filled=Array.isArray(savedProgress)&&savedProgress.length===item.puzzle.data.length
      ? savedProgress
      : new Array(item.puzzle.data.length).fill(false);
    selectedColor=Number(Object.keys(item.puzzle.colors)[0]);
    zoom=1;
    hintIndex=-1;
    render();
  }

  function render(){
    renderCanvas();
    callbacks.onRenderPalette?.(getPaletteState());
    callbacks.onProgress?.(getProgress());
    callbacks.onSelection?.(selectedColor,current?.puzzle.colors[selectedColor]);
    callbacks.onZoom?.(zoom);
  }

  function renderCanvas(){
    if(!current)return;
    const puzzle=current.puzzle;
    const size=puzzle.size;
    const cellSize=size<=32?24:size<=64?12:size<=96?8:6;

    canvas.width=size*cellSize;
    canvas.height=size*cellSize;
    canvas.style.width=canvas.width+"px";
    canvas.style.height=canvas.height+"px";

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font=`700 ${Math.max(5,Math.floor(cellSize*.55))}px -apple-system,sans-serif`;

    for(let index=0;index<puzzle.data.length;index++){
      const value=puzzle.data[index];
      const x=(index%size)*cellSize;
      const y=Math.floor(index/size)*cellSize;

      ctx.fillStyle=filled[index]?puzzle.colors[value]:"#faf8f4";
      ctx.fillRect(x,y,cellSize,cellSize);

      if(!filled[index]&&showNumbers&&cellSize>=8){
        ctx.fillStyle="#666";
        ctx.fillText(String(value),x+cellSize/2,y+cellSize/2);
      }

      if(hintIndex===index){
        ctx.strokeStyle="#ffd33d";
        ctx.lineWidth=Math.max(2,cellSize*.15);
        ctx.strokeRect(x+1,y+1,cellSize-2,cellSize-2);
      }

      if(cellSize>=8){
        ctx.strokeStyle="rgba(0,0,0,.13)";
        ctx.lineWidth=1;
        ctx.strokeRect(x,y,cellSize,cellSize);
      }
    }

    canvas.style.transform=`scale(${zoom})`;
  }

  function paintCell(index){
    if(filled[index])return;
    const correct=current.puzzle.data[index];

    if(correct!==selectedColor){
      hintIndex=index;
      renderCanvas();
      callbacks.onMessage?.(`ここは ${correct}番です`);
      setTimeout(()=>{
        hintIndex=-1;
        renderCanvas();
      },700);
      return;
    }

    filled[index]=true;
    render();
    callbacks.onSaveProgress?.(current.id,filled);
    callbacks.onMessage?.("正解！");

    if(filled.every(Boolean)){
      callbacks.onComplete?.(current.id);
    }
  }

  function getPaletteState(){
    if(!current)return [];
    return Object.entries(current.puzzle.colors).map(([number,color])=>{
      const n=Number(number);
      let remaining=0;

      for(let index=0;index<current.puzzle.data.length;index++){
        if(current.puzzle.data[index]===n&&!filled[index])remaining++;
      }

      return {number:n,color,remaining,active:n===selectedColor};
    });
  }

  function getProgress(){
    if(!current)return 0;
    let done=0;
    for(const value of filled)if(value)done++;
    return Math.round(done/current.puzzle.data.length*100);
  }

  function setSelectedColor(number){
    selectedColor=number;
    callbacks.onRenderPalette?.(getPaletteState());
    callbacks.onSelection?.(selectedColor,current?.puzzle.colors[selectedColor]);
  }

  function showHint(){
    if(!current)return false;
    const index=current.puzzle.data.findIndex((value,i)=>value===selectedColor&&!filled[i]);
    if(index<0)return false;

    hintIndex=index;
    renderCanvas();
    setTimeout(()=>{
      hintIndex=-1;
      renderCanvas();
    },1800);

    return true;
  }

  function fillSelectedColor(){
    if(!current)return 0;
    let count=0;

    current.puzzle.data.forEach((value,index)=>{
      if(value===selectedColor&&!filled[index]){
        filled[index]=true;
        count++;
      }
    });

    render();
    callbacks.onSaveProgress?.(current.id,filled);

    if(filled.every(Boolean)){
      callbacks.onComplete?.(current.id);
    }

    return count;
  }

  function reset(){
    if(!current)return;
    filled=new Array(current.puzzle.data.length).fill(false);
    render();
    callbacks.onSaveProgress?.(current.id,filled);
  }

  function zoomIn(){zoom=Math.min(3,zoom+.25);renderCanvas();callbacks.onZoom?.(zoom)}
  function zoomOut(){zoom=Math.max(.5,zoom-.25);renderCanvas();callbacks.onZoom?.(zoom)}
  function zoomReset(){zoom=1;renderCanvas();callbacks.onZoom?.(zoom)}
  function toggleNumbers(){showNumbers=!showNumbers;renderCanvas();return showNumbers}
  function getCurrent(){return current}
  function getFilled(){return filled}

  return {
    init,start,setSelectedColor,showHint,fillSelectedColor,reset,
    zoomIn,zoomOut,zoomReset,toggleNumbers,getCurrent,getFilled
  };
})();
