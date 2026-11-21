self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// No private documents are cached. Push payloads intentionally omit document names and references.
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?event.data.json():{}}catch{}
 const safeUrl=typeof payload.url==='string'&&(/^\/documents\/[a-zA-Z0-9-]+$/.test(payload.url)||payload.url==='/reminders')?payload.url:'/reminders';
 event.waitUntil(self.registration.showNotification('Duevo',{body:typeof payload.body==='string'?payload.body:'Ai acte de verificat. Deschide aplicația pentru detalii.',icon:'/icon-192.png?v=duevo-1',badge:'/notification-badge.png?v=duevo-1',tag:typeof payload.tag==='string'?payload.tag:'expiry-reminder',data:{url:safeUrl}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const path=event.notification.data?.url;
 const safe=typeof path==='string'&&(/^\/documents\/[a-zA-Z0-9-]+$/.test(path)||path==='/reminders')?path:'/reminders';
 const url=new URL(safe,self.location.origin).href;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate(url);await client.focus();return}}await self.clients.openWindow(url)})());
});
