import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceModule} from './source-module.mjs';

const publicKey=Buffer.alloc(65,1).toString('base64url');
const state={owner:'a',visible:true,removed:0,created:0,saved:[],readError:null,saveError:null};
const subscription=endpoint=>({endpoint,options:{applicationServerKey:Buffer.alloc(65,1)},toJSON:()=>({keys:{p256dh:'key',auth:'auth'}}),unsubscribe:async()=>{state.removed++;return true}});
let current=subscription('https://fcm.googleapis.com/old');
const registration={pushManager:{getSubscription:async()=>current,subscribe:async()=>{state.created++;return current=subscription('https://fcm.googleapis.com/new-'+state.created)}}};
globalThis.window={PushManager:{},Notification:{}};
globalThis.isSecureContext=true;
globalThis.Notification={permission:'granted',requestPermission:async()=>'granted'};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}}});
globalThis.__pushTestClient={auth:{getUser:async()=>({data:{user:{id:'b'}},error:null})},from:()=>{
 const filters={};
 const query={select(){return query},eq(k,v){filters[k]=v;return query},maybeSingle:async()=>({data:state.visible&&state.owner===filters.user_id?{user_id:state.owner}:null,error:state.readError}),upsert:async values=>{state.saved.push(values);if(values.endpoint.endsWith('/old')&&state.owner!=='b')return {error:{code:'42501'}};return {error:state.saveError}}};
 return query;
}};
const push=await import(sourceModule(readFileSync('src/push.ts','utf8').replace("import {supabase} from './supabase';",'const supabase=globalThis.__pushTestClient;')));

// An old account's invisible row must never be reused or reassigned.
await push.enablePush(publicKey,[17,9]);
assert.equal(state.removed,1);assert.equal(state.created,1);
assert.equal(state.saved[0].user_id,'b');assert.deepEqual(state.saved[0].hours,[9,17]);
assert.notEqual(state.saved[0].endpoint,'https://fcm.googleapis.com/old');

// The same account keeps its existing endpoint, including when delivery is paused.
state.owner='b';const existing=current;
await push.enablePush(publicKey,[11]);
assert.equal(current,existing);assert.equal(state.removed,1);assert.equal(state.created,1);

// A database read failure must preserve the current browser subscription.
state.readError={message:'unavailable'};
await assert.rejects(()=>push.enablePush(publicKey,[9]));
assert.equal(state.removed,1);assert.equal(state.saved.length,2);
state.readError=null;

// An orphaned browser subscription also rotates, and failed saves clean up new subscriptions.
state.visible=false;state.saveError={code:'42501'};
await assert.rejects(()=>push.enablePush(publicKey,[9]),/Nu am putut salva/);
assert.equal(state.created,2);assert.equal(state.removed,3);
console.log('PASS: switching accounts rotates subscriptions, own subscriptions stay intact, read errors preserve subscriptions, failed new saves unsubscribe.');
