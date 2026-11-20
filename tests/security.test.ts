import test from 'node:test';
import assert from 'node:assert/strict';
import {assertProductionConfig,allowedOrigins,originAllowed,csvCell,sessionToken} from '../server/lib/security.ts';

const origins=allowedOrigins({NODE_ENV:'development',PORT:'3000'});
const request=(more={})=>({origin:'http://localhost:5173',fetchSite:'same-site',method:'POST',contentType:'application/json',...more});

test('session tokens are high entropy and unique',()=>{
  const first=sessionToken();assert.ok(first.length>=40);assert.notEqual(first,sessionToken());
});
test('reject cross-origin changes and cross-site requests',()=>{
  assert.equal(originAllowed(request(),origins),true);
  assert.equal(originAllowed(request({origin:'https://attacker.example'}),origins),false);
  assert.equal(originAllowed(request({fetchSite:'cross-site'}),origins),false);
  assert.equal(originAllowed(request({contentType:'text/plain'}),origins),false);
});
test('production fails without strong secret and accepts valid config',()=>{
  assert.throws(()=>assertProductionConfig({NODE_ENV:'production',SESSION_SECRET:'SUBSTITUA_POR_UMA_CHAVE_ALEATORIA_COM_MAIS_DE_32_CARACTERES'}));
  assert.throws(()=>assertProductionConfig({NODE_ENV:'production'}));
  assert.doesNotThrow(()=>assertProductionConfig({NODE_ENV:'production',SESSION_SECRET:'x'.repeat(48)}));
});
test('production allowlist uses explicitly configured origin',()=>{
  assert.deepEqual(allowedOrigins({NODE_ENV:'production',APP_ORIGIN:'https://app.example.com'}),['https://app.example.com']);
  assert.equal(originAllowed(request({origin:'https://app.example.com',fetchSite:'same-origin'}),allowedOrigins({NODE_ENV:'production',APP_ORIGIN:'https://app.example.com'})),true);
});
test('CSV cells neutralize spreadsheet formulas and escape quotes',()=>{
  assert.equal(csvCell('=IMPORTXML("a","b")'),"\"'=IMPORTXML(\"\"a\"\",\"\"b\"\")\"");
  assert.equal(csvCell('normal'), '"normal"');
});
