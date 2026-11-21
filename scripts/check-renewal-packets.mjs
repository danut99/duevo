import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;create table public.documents(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),unique(id,user_id));grant select,insert,delete on public.documents to authenticated;alter table public.documents enable row level security;create policy own_docs on public.documents for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());insert into auth.users values('${a}'),('${b}');`);
 const migration=readFileSync('supabase/migrations/202611210010_renewal_packets.sql','utf8');await db.exec(migration);await db.exec(migration);
 const asUser=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')};
 await asUser(a);const doc=(await db.query('insert into public.documents(user_id) values($1) returning id',[a])).rows[0].id;
 const draft={values:{holder:'Ștefan Țîrlea'},assignments:{registration:['file-a']},originals:['identity']};
 await db.query('insert into public.renewal_packets(document_id,user_id,guide_code,draft) values($1,$2,$3,$4)',[doc,a,'RCA',JSON.stringify(draft)]);
 assert.deepEqual((await db.query('select draft from public.renewal_packets')).rows[0].draft,draft);
 await assert.rejects(()=>db.query("insert into public.renewal_packets(document_id,user_id,guide_code,draft) values($1,$2,'ITP','[]')",[doc,a]));
 await assert.rejects(()=>db.query("insert into public.renewal_packets(document_id,user_id,guide_code,draft) values($1,$2,'OTHER','{}')",[doc,a]));
 await assert.rejects(()=>db.query("update public.renewal_packets set draft=$1",[JSON.stringify({data:'x'.repeat(66000)})]));
 await asUser(b);assert.equal((await db.query('select * from public.renewal_packets')).rows.length,0);
 assert.equal((await db.query("update public.renewal_packets set draft='{}' returning document_id")).rows.length,0);
 assert.equal((await db.query('delete from public.renewal_packets returning document_id')).rows.length,0);
 await assert.rejects(()=>db.query("insert into public.renewal_packets(document_id,user_id,guide_code) values($1,$2,'PAS')",[doc,b]));
 await assert.rejects(()=>db.query("insert into public.renewal_packets(document_id,user_id,guide_code) values($1,$2,'PAS')",[doc,a]));
 await asUser(a);await db.query("update public.renewal_packets set draft='{}' where document_id=$1",[doc]);await db.query('delete from public.documents where id=$1',[doc]);assert.equal((await db.query('select * from public.renewal_packets')).rows.length,0);
 console.log('PASS: repeatable packet migration; draft persistence/validation; account isolation and parent ownership; deletion cascade.');
}catch(e){console.error(e.message);process.exitCode=1}finally{await db.close()}
