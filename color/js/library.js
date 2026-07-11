window.SalpColorLibrary = (() => {
  function makePattern(id,title,category,size,colorList,fn){
    const colors={};
    colorList.forEach((c,i)=>colors[i+1]=c);
    const data=[];
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        data.push(fn(x,y,size));
      }
    }
    return {id,title,category,source:"built-in",puzzle:{version:5,size,colors,data}};
  }

  function createBuiltIns(){
    return [
      makePattern("builtin-dog","ミニチュアダックス・ブラックタン","dog",24,
        ["#171411","#8b5a35","#d4a174","#f4e6d4"],
        (x,y)=>{
          const body=((x-12)*(x-12))/62+((y-13)*(y-13))/28<1;
          const head=(x-7)*(x-7)+(y-8)*(y-8)<20;
          const ear=(x-3)*(x-3)+(y-9)*(y-9)<11;
          const legs=(y>17&&((x>7&&x<10)||(x>14&&x<17)));
          if(ear)return 1;
          if(head){
            if(x<7&&y>8)return 2;
            if(x>8&&y>9)return 3;
            return 1;
          }
          if(body){
            if(y>14&&x>10)return 2;
            return 1;
          }
          if(legs)return 1;
          return 4;
        }
      ),
      makePattern("builtin-cat","三毛猫","cat",24,
        ["#f2a46f","#fff0dc","#5e4034","#ef86a5"],
        (x,y,s)=>{
          const cx=s/2,cy=s/2;
          if((x-5)*(x-5)+(y-5)*(y-5)<12)return 1;
          if((x-(s-6))*(x-(s-6))+(y-5)*(y-5)<12)return 1;
          const d=(x-cx)*(x-cx)+(y-cy)*(y-cy);
          if(d<90){
            if(y>13&&Math.abs(x-cx)<2)return 4;
            if(y<11&&(x<9||x>14))return 3;
            return 2;
          }
          return 1;
        }
      ),
      makePattern("builtin-cake","いちごケーキ","sweets",24,
        ["#f7bfd2","#fff2df","#b67546","#e84d68"],
        (x,y)=>{
          if(y<4&&x>8&&x<15)return 4;
          if(y>=5&&y<10&&x>4&&x<19)return 1;
          if(y>=10&&y<14&&x>3&&x<20)return 2;
          if(y>=14&&y<18&&x>3&&x<20)return 3;
          if(y>=18&&y<22&&x>3&&x<20)return 2;
          return 1;
        }
      )
    ];
  }

  function drawPuzzleThumb(target,puzzle){
    target.width=256;
    target.height=256;
    const tctx=target.getContext("2d");
    const cell=256/puzzle.size;
    puzzle.data.forEach((value,index)=>{
      const x=(index%puzzle.size)*cell;
      const y=Math.floor(index/puzzle.size)*cell;
      tctx.fillStyle=puzzle.colors[value];
      tctx.fillRect(x,y,Math.ceil(cell),Math.ceil(cell));
    });
  }

  async function loadRemoteIndex(url="library/index.json"){
    const response=await fetch(`${url}?t=${Date.now()}`,{cache:"no-store"});
    if(!response.ok)throw new Error("library index not found");
    const index=await response.json();
    const loaded=[];

    for(const entry of index.puzzles||[]){
      const puzzlePath=entry.puzzle||entry.json||entry.file;
      if(!puzzlePath)continue;
      const responsePuzzle=await fetch(`${puzzlePath}?t=${Date.now()}`,{cache:"no-store"});
      if(!responsePuzzle.ok)continue;
      const raw=await responsePuzzle.json();
      const puzzle=raw.puzzle||raw;
      loaded.push({
        id:entry.id||`remote-${loaded.length}`,
        title:entry.title||"Online Puzzle",
        category:entry.category||"salp",
        source:"remote",
        image:entry.image||"",
        puzzle
      });
    }

    return loaded;
  }

  return {createBuiltIns,drawPuzzleThumb,loadRemoteIndex};
})();
