/* Service Worker "Catatan Hafalan" — menyimpan salinan halaman ini + font +
   pustaka PDF di cache perangkat, supaya kalau HP dibuka lagi tanpa
   internet, halamannya tetap bisa dimuat (bukan layar "Tidak ada koneksi"
   bawaan browser). Harus disajikan sebagai file .js asli (bukan Blob URL)
   karena browser menolak mendaftarkan Service Worker dari blob:. */
const CACHE='catatan-hafalan-v2';
const PRECACHE=[self.registration.scope,
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(
    PRECACHE.map(u=>fetch(u,{mode:'no-cors'}).then(r=>c.put(u,r)).catch(()=>{}))
  )));
});

self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  ]));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const isStaticShell=PRECACHE.indexOf(e.request.url)>-1;
  if(!isStaticShell){
    /* Data dinamis (mis. Google Sheets): selalu ambil langsung dari internet
       supaya tidak pernah macet di jawaban lama. Cache hanya dipakai kalau
       jaringan benar-benar gagal (offline), bukan sebagai jawaban utama. */
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    const fetchP=fetch(e.request).then(res=>{
      try{
        if(res&&(res.ok||res.type==='opaque')){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
      }catch(err){}
      return res;
    }).catch(()=>cached);
    return cached||fetchP;
  }));
});
