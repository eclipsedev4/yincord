module.exports = {
 appId: 'app.yincord.v2',
 productName: 'Yincord',
 artifactName: 'Yincord-V2-${version}-win-${arch}.${ext}',
 directories: {output: 'yincord-release'},
 files: ['dist/**/*', 'package.json'],
 extraResources: [{from: '../LICENSE', to: 'LICENSE'}, {from: '../YINCORD-V2.md', to: 'YINCORD-V2.md'}],
 asar: true,
 asarUnpack: ['dist/renderer/**/*', '**/*.node'],
 npmRebuild: false,
 publish: null,
 win: {target: [{target: 'portable', arch: ['x64']}], icon: 'build_resources/yincord.png', signAndEditExecutable: false},
 protocols: [{name: 'Yincord', schemes: ['yincord']}]
};
