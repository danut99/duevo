// Load the small locale module in source-level Node checks, without a browser or bundler.
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const data=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const catalog=data(readFileSync('src/translations.en.ts','utf8'));
export const localeModule=data(readFileSync('src/i18n.ts','utf8').replace("'./translations.en.ts'",JSON.stringify(catalog)));
export const sourceModule=source=>data(source.replace(/(['"])\.\/i18n(?:\.ts)?\1/g,JSON.stringify(localeModule)));
