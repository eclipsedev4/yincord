import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'source');
const repo = path.resolve(import.meta.dirname, '..');
fs.cpSync(path.join(repo, 'overlay'), root, {recursive:true});
function edit(file, before, after) {
 const target=path.join(root,file), text=fs.readFileSync(target,'utf8');
 if(!text.includes(before)) throw new Error('Upstream changed: '+file+' missing '+before);
 fs.writeFileSync(target,text.replaceAll(before,after));
}
const identity='fluxer_desktop/src/common/DesktopIdentity.ts';
edit(identity, "'app.fluxer", "'app.yincord.v2");
edit(identity, "'fluxer", "'yincord_v2");
// Keep profiles separate from both upstream Fluxer and the original Yincord app.
for (const file of ['fluxer_desktop/src/common/UserDataPath.ts', 'fluxer_desktop/scripts/release-check.mjs']) {
 edit(file, "stable: 'fluxer'", "stable: 'yincord-v2'");
 edit(file, "canary: 'fluxercanary'", "canary: 'yincord-v2-canary'");
 edit(file, "development: 'fluxerdevelopment'", "development: 'yincord-v2-development'");
}
edit('fluxer_desktop/scripts/release-check.mjs', '/^fluxer/iu', '/^yincord/iu');
edit('fluxer_desktop/scripts/release-check.mjs', "{env: environment, stdio: 'ignore'}", "{env: environment, stdio: 'inherit'}");
// Reuse upstream's native compilation, artifact-copying and verification without rebuilding the renderer.
edit('fluxer_desktop/scripts/build.mjs', 'function buildNativeAddons() {', 'export function buildNativeAddons() {');
const constants='fluxer_desktop/src/common/Constants.ts';
edit(constants, "stable: 'fluxer'", "stable: 'yincord'");
edit(constants, "canary: 'fluxer'", "canary: 'yincord-canary'");
edit(constants, "development: 'fluxer-development'", "development: 'yincord-development'");
edit('fluxer_desktop/src/main/LaunchOptions.ts', "return hasFlag(argv, DISABLE_MODULE_UPDATES_ARGS) || truthyEnv('FLUXER_DISABLE_MODULE_UPDATES');", "// Yincord ships its renderer locally and does not consume upstream update feeds.\n\treturn true;");
edit('fluxer_desktop/src/splash/index.html', 'Fluxer Updater', 'Yincord');
const pkgPath=path.join(root,'fluxer_desktop/package.json');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
pkg.version=process.env.BUILD_VERSION || '2.0.0';
pkg.description='Yincord desktop chat';
pkg.homepage='https://github.com/eclipsedev4/yincord';
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
fs.copyFileSync(path.join(repo,'assets/icon.png'),path.join(root,'fluxer_desktop/build_resources/yincord.png'));
fs.copyFileSync(path.join(repo,'packaging.cjs'),path.join(root,'fluxer_desktop/yincord-builder.cjs'));
console.log('Applied Yincord source overlay.');
