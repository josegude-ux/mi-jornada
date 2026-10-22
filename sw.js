const CACHE='control-jornada-mobile-v0.9.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./data.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('control-jornada-mobile-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==self.location.origin||event.request.method!=='GET')return;
if(u.pathname.endsWith('/version.json')||u.pathname.endsWith('/sw.js')){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));});
