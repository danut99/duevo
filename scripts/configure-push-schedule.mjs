// Configure only this checkout's Supabase project. Secrets travel through stdin, never shell arguments.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
process.loadEnvFile('.env.local');
const projectUrl=new URL(process.env.VITE_SUPABASE_URL);
if(!/^[a-z0-9]+\.supabase\.co$/.test(projectUrl.hostname)||projectUrl.protocol!=='https:')throw Error('Unsupported project URL.');
const ref=projectUrl.hostname.split('.')[0];
const settings=Object.fromEntries(readFileSync('.env.push','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
const secret=settings.PUSH_CRON_SECRET;if(!/^[a-f0-9]{64}$/.test(secret||''))throw Error('Missing generated cron secret.');
const sqlQuote=value=>"'"+value.replace(/'/g,"''")+"'";
const definitions=[['expiry_push_url',projectUrl.origin+'/functions/v1/push'],['expiry_push_cron_secret',secret]];
const setup=definitions.map(([name,value])=>`do $vault_setup$ declare existing uuid;begin select id into existing from vault.secrets where name=${sqlQuote(name)};if existing is null then perform vault.create_secret(${sqlQuote(value)},${sqlQuote(name)},'ExpiryPocket push schedule');else perform vault.update_secret(existing,${sqlQuote(value)},${sqlQuote(name)},'ExpiryPocket push schedule');end if;end $vault_setup$;`).join('\n');
const sql='begin;\n'+setup+'\n'+readFileSync('supabase/schedule-push.sql','utf8').replace(/^\uFEFF/,'')+'\ncommit;';
const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['--yes','supabase','db','query',`--remote=${ref}`,'--yes','--output','json'],{shell:process.platform==='win32',input:sql,encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
if(result.status!==0){const safe=((result.stderr||'')+(result.stdout||'')).replaceAll(secret,'[redacted]');throw Error('Schedule setup failed: '+safe.slice(0,1200))}
console.log('Vault secrets and the 15-minute push schedule are configured for '+ref+'. Secret values were not printed.');
