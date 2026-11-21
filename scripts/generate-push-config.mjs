import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import webpush from 'web-push';
const path='.env.push';if(existsSync(path))throw Error('The existing .env.push was preserved. Reuse its VAPID keys; rotating them invalidates subscriptions.');
const keys=webpush.generateVAPIDKeys();
writeFileSync(path,[`VAPID_PUBLIC_KEY=${keys.publicKey}`,`VAPID_PRIVATE_KEY=${keys.privateKey}`,'VAPID_SUBJECT=https://expiry-pocket-danut.sablepine5.chatgpt.site',`PUSH_CRON_SECRET=${randomBytes(32).toString('hex')}`,''].join('\n'),{mode:0o600,flag:'wx'});
console.log('Created ignored .env.push with VAPID keys and a cron secret. Secret values were not printed.');
