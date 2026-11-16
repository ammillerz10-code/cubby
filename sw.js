// Cubby offline support: keeps the app shell cached so it opens without a connection.
const CACHE="cubby-v1";
const LOCAL=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png"];
const CDN=["https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"];
const SHELL_HOSTS=["unpkg.com","cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all([
    ...LOCAL.map(u=>c.add(u).catch(()=>{})),
    ...CDN.map(u=>fetch(new Request(u,{mode:"no-cors"})).then(r=>c.put(u,r)).catch(()=>{}))
  ])));
  self.skipWaiting();
});

self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;
  if(!sameOrigin&&!SHELL_HOSTS.includes(url.hostname)) return;
  if(req.mode==="navigate"){
    e.respondWith(fetch(req).then(res=>{ const copy=res.clone(); caches.open(CACHE).then(c=>c.put("./index.html",copy)); return res; }).catch(()=>caches.match("./index.html")));
    return;
  }
  if(sameOrigin){
    e.respondWith(fetch(req).then(res=>{ if(res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); } return res; }).catch(()=>caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{ if(res.ok||res.type==="opaque"){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); } return res; })));
});
