module.exports = {
 appId: 'app.yincord.v2',
 productName: 'Yincord',
 artifactName: 'Yincord-V2-${version}-win-${arch}.${ext}',
 directories: {output: 'yincord-release'},
 // Debugging source maps are not needed to run the release.
 files: ['dist/**/*', 'package.json', '!dist/**/*.js.map', '!dist/**/*.cjs.map', '!dist/**/*.css.map'],
 extraResources: [
  {from: '../LICENSE', to: 'LICENSE'},
  {from: '../YINCORD-V2.md', to: 'YINCORD-V2.md'},
  {from: 'build_resources/yincord.png', to: 'icons/icon.png'}
 ],
 asar: {unpack: ['dist/renderer/**/*', '**/*.node']},
 nativeModules: {npmRebuild: false},
 publish: null,
 win: {target: [{target: 'portable', arch: ['x64']}], icon: 'build_resources/yincord.png'},
 protocols: [{name: 'Yincord', schemes: ['yincord']}]
};
