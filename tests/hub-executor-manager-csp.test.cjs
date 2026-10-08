'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = ['lets-talk.html','dixit.html','once-upon-a-time.html','cut.html',
 'open-mic-rescue.html','bluff-king-live-chat.html','chat-wolf.html','play.html'];
const project = path.resolve(__dirname,'..');
const html = page => fs.readFileSync(path.join(project,page),'utf8');
const helper = fs.readFileSync(path.join(project,'hub-executor.js'),'utf8');
const endpoint = helper.match(/const\s+endpoint\s*=\s*(['"])(.*?)\1/)?.[2];
const hub = new URL('https://hub.invalid/');
const service = new URL(endpoint,hub);
function directives(policy) {
 const parsed = new Map();
 for (const part of policy.split(';')) {
  const [name,...values] = part.trim().split(/\s+/);
  if (name && !parsed.has(name.toLowerCase())) parsed.set(name.toLowerCase(),values);
 }
 return parsed;
}
function metaPolicies(source) {
 return [...source.matchAll(/<meta\b([^>]*)>/gi)].flatMap(match => {
  const attributes = Object.fromEntries([...match[1].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(attribute =>
   [attribute[1].toLowerCase(),attribute[3]]));
  return attributes['http-equiv']?.toLowerCase()==='content-security-policy' ? [attributes.content || ''] : [];
 });
}
function allowsConnection(policy,destination=service) {
 const parsed = directives(policy), sources = parsed.get('connect-src') || parsed.get('default-src');
 if (!sources) return true;
 return sources.some(source => {
  if (source==="'self'") return destination.origin===hub.origin;
  if (source==="'none'") return false;
  if (source==='*') return true;
  if (/^[a-z]+:$/.test(source)) return source===destination.protocol;
  // Production uses exact HTTPS origins. A path-scoped exact source still
  // needs to include the endpoint, rather than merely matching its hostname.
  try {
   const url = new URL(source);
   return url.origin===destination.origin && (url.pathname==='/' ||
    (url.pathname.endsWith('/') ? destination.pathname.startsWith(url.pathname) : destination.pathname===url.pathname));
  } catch { return false; }
 });
}
function enforcingHeaders(page) {
 const config = JSON.parse(fs.readFileSync(path.join(project,'vercel.json'),'utf8'));
 const routePolicies = (config.routes || []).flatMap(route => {
  if (!route.src || !new RegExp(route.src).test('/'+page)) return [];
  return Object.entries(route.headers || {}).filter(([key])=>key.toLowerCase()==='content-security-policy').map(([,value])=>value);
 });
 const declarativePolicies = (config.headers || []).flatMap(entry => {
  const pattern = entry.source==='/(.*)' ? /^\/.*$/ : new RegExp('^'+entry.source.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$');
  if (!pattern.test('/'+page)) return [];
  return (entry.headers || []).filter(header=>header.key.toLowerCase()==='content-security-policy').map(header=>header.value);
 });
 return [...routePolicies,...declarativePolicies];
}

test('policy regression detects the original blocked executor, default-src fallback and independently enforced intersections',()=>{
 const old="default-src 'self'; connect-src 'self' https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app";
 const allowed=old+' '+service.origin;
 assert.equal(allowsConnection(old),false);
 assert.equal(allowsConnection("default-src 'self'"),false);
 assert.equal(allowsConnection(allowed),true);
 assert.equal([allowed,"connect-src 'self'"].every(policy=>allowsConnection(policy)),false);
 assert.equal(allowsConnection("connect-src "+service.origin+'/api/open-mic-discovery'),false);
 assert.equal(allowsConnection("connect-src "+service.href),true);
});
test('policy inventory includes enforcing meta policies without confusing report-only or unrelated metadata',()=>{
 const source='<meta http-equiv="Content-Security-Policy-Report-Only" content="connect-src none">'+
  '<meta name="description" content="connect-src none">'+
  '<meta HTTP-EQUIV="Content-Security-Policy" content="default-src self; connect-src '+service.origin+'">'+
  '<meta http-equiv="Content-Security-Policy" content="connect-src self">';
 assert.equal(metaPolicies(source).length,2);
 assert.equal(metaPolicies(source).every(policy=>allowsConnection(policy)),false);
});
for (const page of pages) {
 test(page+': every enforcing connection policy permits the actual independent executor endpoint',()=>{
  const policies = [...metaPolicies(html(page)),...enforcingHeaders(page)];
  for (const policy of policies) assert.ok(allowsConnection(policy),page+' blocks '+service.origin+' under '+policy);
 });
}
test('Wolf keeps exact Firebase and executor origins while retaining script, frame and form protections',()=>{
 assert.equal(service.origin,'https://icebreaker-youtube-search.vercel.app');
 const policies = metaPolicies(html('chat-wolf.html'));assert.equal(policies.length,1);
 const parsed=directives(policies[0]);
 assert.deepEqual(parsed.get('connect-src'),["'self'",'https://livechat-92f66-default-rtdb.asia-southeast1.firebasedatabase.app',service.origin]);
 assert.deepEqual(parsed.get('default-src'),["'self'"]);assert.deepEqual(parsed.get('script-src'),["'self'"]);
 assert.deepEqual(parsed.get('base-uri'),["'self'"]);assert.deepEqual(parsed.get('form-action'),["'self'"]);
 assert.deepEqual(parsed.get('img-src'),["'self'",'data:']);assert.deepEqual(parsed.get('style-src'),["'self'","'unsafe-inline'"]);
 assert.equal(allowsConnection(policies[0],new URL('https://unrelated.invalid/api/hub-executor')),false);
});
