type InstallPromptEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:'accepted'|'dismissed'}>;
};
let pending:InstallPromptEvent|null=null;
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 pending=event as InstallPromptEvent;
});
window.addEventListener('appinstalled',()=>{pending=null});

export async function promptInstall():Promise<boolean>{
 const event=pending;
 if(!event)return false;
 pending=null;
 try{
  await event.prompt();
  await event.userChoice;
  return true;
 }catch{return false}
}
