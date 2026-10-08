'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { packageService } = require('../scripts/hub-executor-package-service.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-package-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const serviceRoot = path.join(root,'service'), gameRoot = path.join(root,'game'), output = path.join(root,'package');
  function put(dir, relative, text) { const target=path.join(dir,relative); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,text); }
  for (const file of ['api/open-mic-discovery.js','api/open-mic-lyrics.js','lib/youtube-discovery.js','lib/genius-metadata.js']) put(serviceRoot,file,'module.exports = {};');
  put(serviceRoot,'package.json','{"private":true}');
  put(serviceRoot,'vercel.json',JSON.stringify({functions:{'api/open-mic-discovery.js':{maxDuration:15}},routes:[{src:'^/api/open-mic-discovery/?$',dest:'/api/open-mic-discovery.js'},{src:'^/.*$',status:404}]}));
  for (const file of ['.env.local','.vercel/project.json','auth.json','tests/private.json']) put(serviceRoot,file,'DO_NOT_PACKAGE_PRIVATE_MARKER');
  put(gameRoot,'api/hub-executor.js',"module.exports=require('../runtime/core.cjs');");
  put(gameRoot,'runtime/core.cjs',"const crypto=require('node:crypto');module.exports=require('../engine.js');");
  put(gameRoot,'engine.js',"module.exports={loaded:true};");
  put(gameRoot,'.env','DO_NOT_PACKAGE_PRIVATE_MARKER');
  return {root, serviceRoot, gameRoot, output, put};
}
test('independent package preserves search and retirement endpoints and bundles transitive runtime only', t => {
  const f=fixture(t), files=packageService(f);
  assert.equal(require(path.join(f.output,'api/hub-executor.js')).loaded,true);
  assert.deepEqual(files.sort(), ['api/hub-executor.js','api/open-mic-discovery.js','api/open-mic-lyrics.js','engine.js','lib/genius-metadata.js','lib/youtube-discovery.js','package.json','runtime/core.cjs','vercel.json'].sort());
  const config=JSON.parse(fs.readFileSync(path.join(f.output,'vercel.json'),'utf8'));
  assert.equal(config.functions['api/open-mic-discovery.js'].maxDuration,15);
  assert.equal(config.functions['api/hub-executor.js'].maxDuration,60);
  assert.deepEqual(config.routes.at(-1),{src:'^/.*$',status:404});
  assert.deepEqual(config.routes[0],{src:'^/api/hub-executor/?$',dest:'/api/hub-executor.js'});
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.join(f.output,file),'utf8'),/DO_NOT_PACKAGE_PRIVATE_MARKER/);
  const ignore=fs.readFileSync(path.join(f.output,'.vercelignore'),'utf8');
  assert.match(ignore,/^\*\n/); assert.match(ignore,/!runtime\n!runtime\/core.cjs/); assert.doesNotMatch(ignore,/!\.env|!auth|!\.vercel/);
});
test('packager rejects overlapping source directories, occupied output and escaping dependencies', t => {
  const f=fixture(t);
  assert.throws(()=>packageService({...f,output:path.join(f.serviceRoot,'out')}),/isolated/);
  assert.throws(()=>packageService({...f,output:f.gameRoot}),/isolated/);
  f.put(f.output,'existing.txt','keep');
  assert.throws(()=>packageService(f),/empty/); assert.equal(fs.readFileSync(path.join(f.output,'existing.txt'),'utf8'),'keep');
  f.put(f.gameRoot,'api/hub-executor.js',"module.exports=require('../../outside.js');");
  assert.throws(()=>packageService({...f,output:path.join(f.root,'new-package')}),/Invalid runtime dependency/);
});
