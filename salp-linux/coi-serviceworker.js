self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
 const r=event.request;
 if(r.cache==="only-if-cached"&&r.mode!=="same-origin")return;
 event.respondWith((async()=>{
  const res=await fetch(r);
  if(!res||res.status===0||res.type==="opaque")return res;
  const h=new Headers(res.headers);
  h.set("Cross-Origin-Opener-Policy","same-origin");
  h.set("Cross-Origin-Embedder-Policy","require-corp");
  h.set("Cross-Origin-Resource-Policy","cross-origin");
  return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
 })());
});