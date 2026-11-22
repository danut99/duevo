import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {sourceModule,localeModule} from './source-module.mjs';
const {monthlyPlan}=await import(sourceModule(readFileSync('src/monthly-plan.ts','utf8')));
const doc=(id,expires,extra={})=>({id,expires,name:id,...extra});
const rows=[doc('next','2027-01-01'),doc('late','2026-11-30'),doc('old','2026-10-01'),doc('done','2026-11-10',{completedAt:'2026-11-11'}),doc('today','2026-11-22'),doc('morning','2026-11-23',{eventTime:'09:00'}),doc('evening','2026-11-23',{eventTime:'16:00'})];
const plan=monthlyPlan(rows,new Date(2026,10,22,12));
assert.deepEqual(plan.items.map(d=>d.id),['old','today','morning','evening','late']);
assert.equal(plan.overdue,1);assert.equal(plan.thisMonth,4);assert.equal(plan.end,'2026-11-30');
assert.equal(monthlyPlan(rows,new Date(2026,11,31)).end,'2026-12-31');
assert.equal(monthlyPlan([],new Date(2028,1,1)).end,'2028-02-29');
assert.equal(monthlyPlan(rows,new Date(2026,10,1)).items.length,5);
const {tr,setLanguage,locale,setCountry,getCountry}=await import(localeModule);
assert.equal(getCountry(),'OTHER');setCountry('RO');setLanguage('en');assert.equal(getCountry(),'RO');setCountry('OTHER');assert.equal(locale(),'en-GB');
setLanguage('en');assert.equal(tr('Actele mele'),'My documents');assert.equal(tr('Emailurile au fost oprite.'),'Emails turned off.');assert.equal(tr('Ce ai de rezolvat luna aceasta'),'What needs doing this month');assert.equal(tr('Mașinile tale'),'Your vehicles');assert.equal(tr('Ora de trimitere'),'Delivery time');
assert.equal(tr('În {0} {1}',7,tr('zile')),'In 7 days');assert.equal(locale(),'en-GB');
setLanguage('ro');assert.equal(tr('Actele mele'),'Actele mele');assert.equal(locale(),'ro-RO');
const catalogSource=readFileSync('src/translations.en.ts','utf8'),catalog=JSON.parse(catalogSource.slice(catalogSource.indexOf('=')+1).trim().replace(/;$/,''));
const placeholders=value=>[...value.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
for(const [key,value] of Object.entries(catalog))assert.deepEqual(placeholders(value),placeholders(key),'Placeholder mismatch: '+key);
for(const file of readdirSync('src').filter(f=>/\.tsx?$/.test(f)&&f!=='translations.en.ts')){
 const source=ts.createSourceFile(file,readFileSync('src/'+file,'utf8'),ts.ScriptTarget.Latest,true);
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='tr'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))assert(Object.hasOwn(catalog,node.arguments[0].text),'Missing English translation in '+file+': '+node.arguments[0].text);ts.forEachChild(node,visit)};visit(source);
}
console.log('PASS: calendar-month boundaries, overdue ordering, completed exclusion, time ordering, leap year, Romanian/English catalog anchors, interpolation and locale.');
