window.SalpColorImage = (() => {
  function rgbToHex(r,g,b){
    return "#"+[r,g,b]
      .map(value=>Math.round(Math.max(0,Math.min(255,value))).toString(16).padStart(2,"0"))
      .join("");
  }

  function distance(a,b){
    const dr=a.r-b.r;
    const dg=a.g-b.g;
    const db=a.b-b.b;
    return dr*dr+dg*dg+db*db;
  }

  function buildPalette(sample,k,iterations=8){
    const centers=[];
    const stride=Math.max(1,Math.floor(sample.length/k));

    for(let i=0;i<k;i++){
      const pixel=sample[Math.min(i*stride,sample.length-1)];
      centers.push({...pixel});
    }

    for(let iteration=0;iteration<iterations;iteration++){
      const sums=Array.from({length:k},()=>({r:0,g:0,b:0,n:0}));

      for(const pixel of sample){
        let best=0;
        let bestDistance=Infinity;

        centers.forEach((center,index)=>{
          const d=distance(pixel,center);
          if(d<bestDistance){
            bestDistance=d;
            best=index;
          }
        });

        const sum=sums[best];
        sum.r+=pixel.r;
        sum.g+=pixel.g;
        sum.b+=pixel.b;
        sum.n++;
      }

      centers.forEach((center,index)=>{
        const sum=sums[index];
        if(sum.n){
          centers[index]={
            r:sum.r/sum.n,
            g:sum.g/sum.n,
            b:sum.b/sum.n
          };
        }
      });
    }

    return centers;
  }

  function assignPixels(pixels,centers){
    const result=new Uint8Array(pixels.length);

    pixels.forEach((pixel,index)=>{
      let best=0;
      let bestDistance=Infinity;

      centers.forEach((center,centerIndex)=>{
        const d=distance(pixel,center);
        if(d<bestDistance){
          bestDistance=d;
          best=centerIndex;
        }
      });

      result[index]=best+1;
    });

    return Array.from(result);
  }

  async function createPuzzleFromImage(image,size,colorCount){
    const work=document.createElement("canvas");
    work.width=size;
    work.height=size;
    const wctx=work.getContext("2d",{willReadFrequently:true});

    const scale=Math.max(size/image.width,size/image.height);
    const drawWidth=image.width*scale;
    const drawHeight=image.height*scale;

    wctx.drawImage(image,(size-drawWidth)/2,(size-drawHeight)/2,drawWidth,drawHeight);

    const raw=wctx.getImageData(0,0,size,size).data;
    const pixels=[];

    for(let i=0;i<raw.length;i+=4){
      pixels.push({r:raw[i],g:raw[i+1],b:raw[i+2]});
    }

    const sample=[];
    const step=Math.max(1,Math.floor(pixels.length/4096));
    for(let i=0;i<pixels.length;i+=step){
      sample.push(pixels[i]);
    }

    const centers=buildPalette(sample,colorCount,8);
    const assignments=assignPixels(pixels,centers);
    const colors={};

    centers.forEach((center,index)=>{
      colors[index+1]=rgbToHex(center.r,center.g,center.b);
    });

    return {version:5,size,colors,data:assignments};
  }

  return {createPuzzleFromImage};
})();
