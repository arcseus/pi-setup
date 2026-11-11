import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const tools = ['plan_mode_complete', 'subagent', 'web_search', 'fetch_content', 'ask_user_question', 'bash_output', 'todo', 'lens_diagnostics'];
const commands = ['plan', 'permission-system', 'undo', 'redo', 'bg', 'btw', 'worktree', 'todos', 'plannotator-review'];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'pi-prerequisite-test-'));
  const bin = join(dir, 'bin'), agent = join(dir, 'agent'); mkdirSync(bin); mkdirSync(agent);
  const pi = join(bin, 'pi');
  writeFileSync(pi, `#!${process.execPath}\nimport fs from 'node:fs';\nimport path from 'node:path';\nconst args=process.argv.slice(2);\nif(args[0]==='--version'){console.log(process.env.FIXTURE_PI_VERSION ?? '1.5.2');}\nelse if(args[0]==='install'){\n fs.appendFileSync(process.env.FIXTURE_LOG,JSON.stringify(args)+'\\n');\n const p=path.join(process.env.PI_CODING_AGENT_DIR,'settings.json');\n const s=JSON.parse(fs.readFileSync(p,'utf8'));s.packages=[...(s.packages??[]),args[1]];fs.writeFileSync(p,JSON.stringify(s));\n if(process.env.FIXTURE_FAIL==='1')process.exit(7);\n}\nelse if(args[0]==='--mode'){console.log(JSON.stringify({type:'extension_ui_request',method:'notify',message:'PI_SETUP_CHECK '+JSON.stringify({tools:${JSON.stringify(tools)},commands:${JSON.stringify(commands)}})}));}\nelse process.exit(3);\n`, { mode: 0o755 });
  // .mjs-free fixture executable uses module syntax; mark its directory as ESM.
  writeFileSync(join(bin, 'package.json'), '{"type":"module"}');
  writeFileSync(join(bin, 'agent-browser'), '#!/bin/sh\nif [ "$1" = install ]; then exit 91; fi\nprintf "agent-browser 0.42.0\\n"\n', { mode: 0o755 });
  const settings = '{\n  "defaultModel": "keep-this", "packages": [], "myPreference": true\n}\n';
  const auth = '{"fixture":{"type":"api_key","key":"not-a-real-key"}}\n';
  writeFileSync(join(agent, 'settings.json'), settings); writeFileSync(join(agent, 'auth.json'), auth);
  const config = join(dir, 'config.json'); writeFileSync(config, '{}');
  const env = { ...process.env, PATH: `${bin}:${dirname(process.execPath)}:${process.env.PATH}`, PI_CODING_AGENT_DIR: agent, FIXTURE_LOG: join(dir, 'calls') };
  const run = overrides => spawnSync('/bin/bash', [join(root, 'setup.sh'), config], { env: { ...env, ...overrides }, encoding: 'utf8', timeout: 30000 });
  return { dir, agent, pi, settings, auth, env, run, config };
}

test('setup configures the existing Pi, preserves auth, and reruns without duplicate registrations', () => {
  const f = fixture();
  try {
    const binary = readFileSync(f.pi);
    let result = f.run(); assert.equal(result.status, 0, result.stderr);
    const settings = JSON.parse(readFileSync(join(f.agent, 'settings.json')));
    assert.equal(settings.defaultModel, 'keep-this'); assert.equal(settings.myPreference, true);
    assert.equal(settings.packages.length, 12);
    assert.equal(readFileSync(join(f.agent, 'auth.json'), 'utf8'), f.auth);
    assert.deepEqual(readFileSync(f.pi), binary);
    const calls = readFileSync(f.env.FIXTURE_LOG, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(calls.length, 12);
    assert.ok(calls.every(args => args[0] === 'install' && !args[1].includes('pi-coding-agent')));
    result = f.run(); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(f.agent, 'settings.json'))).packages.length, 12);
    writeFileSync(f.config, JSON.stringify({ features: { visualPlans: 'skip' } }));
    result = f.run(); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(f.agent, 'settings.json'))).packages.length, 11);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('an unsupported installed Pi fails before configuration changes', () => {
  const f = fixture();
  try {
    const result = f.run({ FIXTURE_PI_VERSION: '0.73.1' });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /Pi 1.5.2/);
    assert.equal(readFileSync(join(f.agent, 'settings.json'), 'utf8'), f.settings);
    assert.equal(existsSync(f.env.FIXTURE_LOG), false);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('a partial native package installation restores the exact prior settings and auth', () => {
  const f = fixture();
  try {
    const result = f.run({ FIXTURE_FAIL: '1' });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(f.agent, 'settings.json'), 'utf8'), f.settings);
    assert.equal(readFileSync(join(f.agent, 'auth.json'), 'utf8'), f.auth);
    assert.equal(existsSync(join(f.agent, '.pi-setup.lock')), false);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('malformed settings fail with a file path and no stack trace or mutations', () => {
  const f = fixture();
  try {
    const path = join(f.agent, 'settings.json');
    writeFileSync(path, '{broken');
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Cannot read JSON/);
    assert.ok(result.stderr.includes(path));
    assert.doesNotMatch(result.stderr, /at .*setup.mjs/);
    assert.equal(readFileSync(path, 'utf8'), '{broken');
    assert.equal(existsSync(f.env.FIXTURE_LOG), false);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('invalid settings arrays and known search conflicts stop before installing', () => {
  const f = fixture();
  try {
    for (const settings of [{ packages: {} }, { packages: ['npm:@ollama/pi-web-search'] }]) {
      writeFileSync(join(f.agent, 'settings.json'), JSON.stringify(settings));
      const result = f.run();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /packages must be an array|Conflicting extensions.*@ollama\/pi-web-search/);
      assert.doesNotMatch(result.stderr, /at .*setup.mjs/);
      assert.equal(existsSync(f.env.FIXTURE_LOG), false);
    }
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('missing config and stale lock give actionable errors', () => {
  const f = fixture();
  try {
    rmSync(f.config);
    let result = f.run();
    assert.match(result.stderr, /Missing file:/);
    writeFileSync(f.config, '{}');
    mkdirSync(join(f.agent, '.pi-setup.lock'));
    result = f.run();
    assert.match(result.stderr, /Another setup is running/);
    assert.equal(existsSync(f.env.FIXTURE_LOG), false);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
