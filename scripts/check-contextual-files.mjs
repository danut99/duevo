import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;
 create table public.documents(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),unique(id,user_id));
 create table public.vault_documents(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),unique(id,user_id));
 create table public.document_files(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),document_id uuid,vault_document_id uuid,name text,storage_key text,foreign key(document_id,user_id) references public.documents(id,user_id),foreign key(vault_document_id,user_id) references public.vault_documents(id,user_id),check(num_nonnulls(document_id,vault_document_id)=1));
 alter table public.document_files enable row level security;create policy own_files on public.document_files for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());grant select,insert on public.document_files to authenticated;insert into auth.users values('${a}'),('${b}');`);
 const migration=readFileSync('supabase/migrations/202611210012_contextual_file_links.sql','utf8');await db.exec(migration);await db.exec(migration);
 const docA=(await db.query('insert into public.documents(user_id) values($1) returning id',[a])).rows[0].id,docB=(await db.query('insert into public.documents(user_id) values($1) returning id',[b])).rows[0].id;
 const album=(await db.query('insert into public.vault_documents(user_id,document_kind) values($1,$2) returning id',[a,'TALON'])).rows[0].id;
 const asUser=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')};
 await asUser(a);const file=(await db.query("insert into public.document_files(user_id,vault_document_id,name,storage_key) values($1,$2,'Talon.png',$3) returning *",[a,album,a+'/photo'])).rows[0];
 await db.query('update public.document_files set document_id=$1,vault_document_id=null where id=$2',[docA,file.id]);
 const linked=(await db.query('select * from public.document_files')).rows[0];assert.equal(linked.document_id,docA);assert.equal(linked.storage_key,file.storage_key);assert.equal(linked.id,file.id);
 await assert.rejects(()=>db.query('update public.document_files set document_id=$1 where id=$2',[docB,file.id]));
 await assert.rejects(()=>db.query("update public.document_files set storage_key='changed' where id=$1",[file.id]));
 await assert.rejects(()=>db.query('update public.document_files set document_id=null where id=$1',[file.id]));
 await asUser(b);assert.equal((await db.query('update public.document_files set document_id=$1 where id=$2 returning id',[docB,file.id])).rows.length,0);
 console.log('PASS: contextual file-link migration is repeatable; photo relinking preserves ID/storage; parent ownership, exact-one-parent and column permissions enforced.');
}catch(e){console.error(e.message);process.exitCode=1}finally{await db.close()}
