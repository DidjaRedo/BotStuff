cp LICENSE dist
cp README.md dist
grep -v prepublishOnly package.json | sed s:dist/index.js:index.js: > dist/package.json
