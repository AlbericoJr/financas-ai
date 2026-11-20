import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedOrigins,originAllowed,csvCell} from '../server/lib/security.ts';

const origins=allowedOrigins({NODE_ENV:'development',PORT:'3000'});
const request=(more={})=>({origin:'http://localhost:5173',fetchSite:'same-site',method:'POST',contentType:'application/json',...more});

test('reject cross-origin changes and cross-site requests',()=>{
  assert.equal(originAllowed(request(),origins),true);
  assert.equal(originAllowed(request({origin:'https://attacker.example'}),origins),false);
  assert.equal(originAllowed(request({fetchSite:'cross-site'}),origins),false);
  assert.equal(originAllowed(request({contentType:'text/plain'}),origins),false);
});
test('production allowlist uses explicitly configured origin',()=>{
  assert.deepEqual(allowedOrigins({NODE_ENV:'production',APP_ORIGIN:'https://app.example.com'}),['https://app.example.com']);
  assert.equal(originAllowed(request({origin:'https://app.example.com',fetchSite:'same-origin'}),allowedOrigins({NODE_ENV:'production',APP_ORIGIN:'https://app.example.com'})),true);
});
test('CSV cells neutralize spreadsheet formulas and escape quotes',()=>{
  assert.equal(csvCell('=IMPORTXML("a","b")'),"\"'=IMPORTXML(\"\"a\"\",\"\"b\"\")\"");
  assert.equal(csvCell('normal'), '"normal"');
});
