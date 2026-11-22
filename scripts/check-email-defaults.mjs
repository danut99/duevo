import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table public.email_preferences(user_id uuid primary key references auth.users(id),enabled boolean,hour integer,timezone text);
 insert into auth.users values('00000000-0000-4000-8000-000000000001','existing@example.test',now()),('00000000-0000-4000-8000-000000000002','off@example.test',now());
 insert into public.email_preferences values('00000000-0000-4000-8000-000000000002',false,17,'UTC');`);
 await db.exec(readFileSync('supabase/migrations/202611220002_default_email_reminders.sql','utf8'));
 const pref=async n=>(await db.query('select enabled,hour,timezone from public.email_preferences where user_id=$1',[`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`])).rows[0];
 assert.deepEqual(await pref(1),{enabled:true,hour:9,timezone:'Europe/Bucharest'});
 assert.deepEqual(await pref(2),{enabled:false,hour:17,timezone:'UTC'});
 await db.exec(`insert into auth.users values('00000000-0000-4000-8000-000000000003','new@example.test',null),('00000000-0000-4000-8000-000000000004','google@example.test',now());`);
 assert.equal(await pref(3),undefined);assert.equal((await pref(4)).enabled,true);
 await db.exec(`update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000003';`);
 assert.equal((await pref(3)).enabled,true);
 await db.exec(`update public.email_preferences set enabled=false,hour=16 where user_id='00000000-0000-4000-8000-000000000004';update auth.users set email_confirmed_at=now();`);
 assert.equal((await pref(4)).enabled,false);assert.equal((await pref(4)).hour,16);assert.equal((await pref(2)).enabled,false);
 console.log('PASS: verified accounts default on, unverified excluded, confirmation initializes, existing opt-outs and times preserved.');
}finally{await db.close()}
