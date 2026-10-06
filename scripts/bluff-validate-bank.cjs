'use strict';
const { loadBank } = require('../server/bluff-bank.cjs');
try { const bank = loadBank(); console.log(`${bank.length} verified enabled topics; IDs, canonical IDs, sources, hint counts and public projection validated.`); } catch (e) { console.error(e.message); process.exitCode = 1; }
