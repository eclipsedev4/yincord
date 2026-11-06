import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('source');
const extracted=path.resolve(process.argv[2]);
const pin=JSON.parse(fs.readFileSync('upstream.json','utf8'));
const cache=JSON.parse(fs.readFileSync('native-cache.json','utf8'));
if(cache.upstream_commit!==pin.commit || process.platform!=='win32') throw new Error('Native cache is incompatible');
const {copyRuntimeArtifactsToInstalledPackages,verifyInstalledNativeArtifacts}=await import(pathToFileURL(path.join(root,'fluxer_desktop/scripts/build.mjs')));
const modules=path.join(extracted,'resources/app.asar.unpacked/node_modules/@fluxer');
for(const entry of fs.readdirSync(modules,{withFileTypes:true})) {
 if(!entry.isDirectory() || !/^[a-z0-9-]+$/.test(entry.name)) continue;
 const packageDir=path.join(root,'fluxer_desktop/native',entry.name);
 if(!fs.existsSync(packageDir)) continue;
 for(const file of fs.readdirSync(path.join(modules,entry.name))) {
  if(/\.(node|dll|exe)$/.test(file)) fs.copyFileSync(path.join(modules,entry.name,file),path.join(packageDir,file));
 }
 copyRuntimeArtifactsToInstalledPackages({label:'@fluxer/'+entry.name,packageDir});
}
verifyInstalledNativeArtifacts();
console.log('Restored and verified native modules from the same upstream revision.');
