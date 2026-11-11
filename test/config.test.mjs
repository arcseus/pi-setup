import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveFeatures, makeSettings, packageName, checkVersion, findConflicts } from '../lib/config.mjs';
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

test('all twelve features default to install; invalid selections fail', () => {
  assert.equal(Object.values(resolveFeatures({}, manifest)).filter(Boolean).length, 12);
  assert.throws(() => resolveFeatures({ features: { browesr: 'skip' } }, manifest), /Unknown feature/);
  assert.throws(() => resolveFeatures({ features: { web: 'skpi' } }, manifest), /install.*skip/);
});
test('native Pi sources replace managed versions and preserve personal preferences', () => {
  const old = { defaultModel: 'personal-model', packages: ['npm:personal-extension', 'npm:pi-web-access@0.1.0', { source: '/old/checkout/.local/runtime/node_modules/pi-lens', extensions: [] }], customSetting: { enabled: true } };
  const settings = makeSettings(resolveFeatures({}, manifest), manifest, old);
  assert.equal(settings.defaultModel, 'personal-model');
  assert.deepEqual(settings.customSetting, old.customSetting);
  assert.ok(settings.packages.includes('npm:personal-extension'));
  assert.ok(settings.packages.includes(manifest.piSetup.features.web));
  assert.equal(settings.packages.length, 13);
  assert.ok(!JSON.stringify(settings.packages).includes('/old/checkout'));
});
test('skip removes managed resources; rerunning is idempotent', () => {
  const full = resolveFeatures({}, manifest);
  const first = makeSettings(full, manifest);
  assert.deepEqual(makeSettings(full, manifest, first), first);
  const selected = resolveFeatures({ features: { web: 'skip' } }, manifest);
  assert.ok(!makeSettings(selected, manifest, first).packages.some(p => packageName(p) === 'pi-web-access'));
});
test('native tool defaults are extended without mixing modifier syntax', () => {
  const features = resolveFeatures({}, manifest);
  assert.ok(makeSettings(features, manifest).defaultTools.includes('+codemode'));
  const settings = makeSettings(features, manifest, { defaultTools: ['read'] });
  assert.ok(settings.defaultTools.includes('read') && settings.defaultTools.includes('codemode'));
  assert.ok(settings.defaultTools.every(t => !t.startsWith('+')));
});
test('runtime versions reject unsupported or ambiguous hosts', () => {
  assert.doesNotThrow(() => checkVersion('Pi', '1.5.2', '1.5.2', 2));
  assert.throws(() => checkVersion('Pi', '0.73.1', '1.5.2', 2), /Pi/);
  assert.throws(() => checkVersion('Pi', '2.0.0', '1.5.2', 2), /Pi/);
  assert.throws(() => checkVersion('Node', 'v22.22.1', '24.22.2'), /Node/);
});
test('conflicting engines are surfaced before changing the installation', () => {
  const features = resolveFeatures({}, manifest);
  assert.ok(findConflicts({ packages: ['npm:pi-subagents@0.88.0'] }, features).includes('pi-subagents'));
  assert.deepEqual(findConflicts({ packages: ['npm:personal-extension'] }, features), []);
});

test('web conflicts include Ollama packages and direct extension paths', () => {
  const features = resolveFeatures({}, manifest);
  assert.deepEqual(findConflicts({ packages: ['npm:@ollama/pi-web-search'] }, features), ['@ollama/pi-web-search']);
  assert.deepEqual(findConflicts({ extensions: ['/host/node_modules/@ollama/pi-web-search/index.ts'] }, features), ['@ollama/pi-web-search']);
  assert.deepEqual(findConflicts({ packages: [{ source: 'npm:@ollama/pi-web-search', extensions: [] }] }, features), []);
  assert.deepEqual(findConflicts({ extensions: ['-/host/node_modules/@ollama/pi-web-search/index.ts'] }, features), []);
  assert.deepEqual(findConflicts({ packages: ['npm:@ollama/pi-web-search'] }, { ...features, web: false }), []);
});

test('retired browser registration is removed on upgrade', () => {
  const features = resolveFeatures({ features: { browser: 'install' } }, manifest);
  assert.equal(features.browser, undefined);
  const settings = makeSettings(features, manifest, { packages: ['npm:pi-agent-browser-native@0.9.18'] });
  assert.equal(settings.packages.length, 12);
  assert.ok(!settings.packages.some(p => packageName(p) === 'pi-agent-browser-native'));
});
