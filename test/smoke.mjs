// Exercise real Pi tools/extensions with a deterministic, in-process model.
// No credentials, paid models, or external model requests are used.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { watch } from 'node:fs';
import { resolveFeatures, makeSettings, packageName } from '../lib/config.mjs';
import { loadChecked, installedPiRoot } from './sdk.mjs';

const root = resolve(import.meta.dirname, '..');
const runtime = await installedPiRoot();
const sourceAgentDir = process.env.PI_CODING_AGENT_DIR ?? join(process.env.HOME, '.pi/agent');
const fixture = await mkdtemp(join(tmpdir(), 'pi-setup-smoke-'));
const cwd = join(fixture, 'project');
const agentDir = join(fixture, 'agent');
await mkdir(cwd); await mkdir(agentDir);
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.XDG_CACHE_HOME = join(fixture, 'cache');
process.env.XDG_STATE_HOME = join(fixture, 'state');
process.env.PI_AGENT_BROWSER_CONFIG = join(agentDir, 'browser.json');
const sdk = await import(pathToFileURL(join(runtime, 'dist/index.js')));
const { AssistantMessageEventStream } = await import(pathToFileURL(resolve(runtime, '../pi-ai/dist/utils/event-stream.js')));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const features = resolveFeatures({}, manifest);
const save = async (path, value) => { await mkdir(resolve(path, '..'), { recursive: true }); await writeFile(path, JSON.stringify(value)); };
const settings = makeSettings(features, manifest, { workspaceHistory: { storageDir: join(fixture, 'history') } });
settings.packages = settings.packages.map(source => join(sourceAgentDir, 'npm/node_modules', packageName(source)));
await save(join(agentDir, 'settings.json'), settings);
await save(join(agentDir, 'extensions/pi-permission-system/config.json'), {
  permission: { '*': 'allow', path: { '*': 'allow', '*.env': 'deny' }, bash: { '*': 'ask' }, external_directory: 'ask' },
});
await save(join(agentDir, 'browser.json'), {});
execFileSync('git', ['init', '-q', cwd]);
await writeFile(join(cwd, 'README.md'), 'Fixture\n');
await writeFile(join(cwd, '.env'), 'fixture-secret');
let calls = 0;
const seen = new Map();
function stream(model, context) {
  calls++;
  const marker = [...context.messages].reverse().find(m => m.role === 'user' && JSON.stringify(m.content).includes('CASE:'));
  const text = typeof marker?.content === 'string' ? marker.content : JSON.stringify(marker?.content);
  let action;
  const key = text ?? 'none';
  const step = seen.get(key) ?? 0; seen.set(key, step + 1);
  if (step === 0 && text?.includes('CASE:write')) action = { name: 'write', arguments: { path: 'result.txt', content: 'written by real Pi tool\n' } };
  if (step === 0 && text?.includes('CASE:child')) action = { name: 'subagent', arguments: { prompt: 'CASE:child-shell', description: 'Verify child approval', subagent_type: 'general-purpose', max_turns: 3 } };
  if (step === 0 && text?.includes('CASE:child-shell')) action = { name: 'bash', arguments: { command: 'printf child-approved > child.txt' } };
  // Child markers take precedence over the parent delegation marker.
  if (step === 0 && text?.includes('CASE:plan-write')) action = { name: 'write', arguments: { path: 'forbidden.txt', content: 'must not exist' } };
  if (step === 0 && text?.includes('CASE:background')) action = { name: 'bash', arguments: { command: 'printf background-ready > background.txt', background: true } };
  const message = {
    role: 'assistant', api: 'openai-completions', provider: model.provider, model: model.id,
    content: action ? [{ type: 'toolCall', id: `fixture-${calls}`, ...action }] : [{ type: 'text', text: 'Fixture complete.' }],
    stopReason: action ? 'toolUse' : 'stop', timestamp: Date.now(),
    usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  };
  const result = new AssistantMessageEventStream();
  result.push({ type: 'start', partial: message });
  result.push({ type: 'done', reason: message.stopReason, message });
  result.end();
  return result;
}
const modelRuntime = await sdk.ModelRuntime.create({ authPath: join(agentDir, 'auth.json'), modelsPath: null, modelsStorePath: join(agentDir, 'model-store.json'), refreshOnCreate: false });
modelRuntime.registerProvider('setup-fixture', {
  api: 'openai-completions', baseUrl: 'http://unused.invalid', apiKey: 'fixture', streamSimple: stream,
  models: [{ id: 'fixture', name: 'Fixture', reasoning: false, input: ['text'], contextWindow: 100000, maxTokens: 1000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }],
});
const { loader } = await loadChecked({ runtime, agentDir, cwd, requiredPackages: Object.values(manifest.piSetup.features) });
assert.deepEqual(loader.getExtensions().errors, [], 'all extensions must load');
const { session } = await sdk.createAgentSession({ cwd, agentDir, modelRuntime, model: modelRuntime.getModel('setup-fixture', 'fixture'), resourceLoader: loader, sessionManager: sdk.SessionManager.create(cwd, join(agentDir, 'sessions')) });
const errors = [];
const prompts = [];
const notices = [];
const ui = { ...session.extensionRunner.getUIContext(),
  select: async (title, options) => {
    prompts.push({ title, options });
    return options.find(x => x === 'Yes') ?? options.find(x => /files.*conversation/i.test(x)) ?? options[0];
  },
  confirm: async () => true,
  notify: (message, type) => notices.push({ message, type }),
};
try {
  await session.bindExtensions({ uiContext: ui, mode: 'rpc', onError: e => errors.push(e), commandContextActions: {
    waitForIdle: () => session.waitForIdle(),
    navigateTree: (...args) => session.navigateTree(...args),
  } });
  assert.deepEqual(errors, [], 'all startup hooks must succeed');
  const tools = session.getActiveToolNames();
  for (const name of ['subagent', 'web_search', 'fetch_content', 'ask_user_question', 'todo', 'lens_diagnostics', 'agent_browser', 'bash_output', 'codemode']) assert.ok(tools.includes(name), `${name} must be active`);
  const commands = session.extensionRunner.getRegisteredCommands().map(c => c.name);
  for (const name of ['plan', 'permission-system', 'undo', 'redo', 'bg', 'btw', 'worktree', 'todos', 'plannotator-review', 'mcp']) assert.ok(commands.includes(name), `${name} must be registered`);
  console.log('PASS: all 13 extensions and native MCP/codemode load together');

  const denial = await session.extensionRunner.emitToolCall({ type: 'tool_call', toolName: 'read', toolCallId: 'secret-check', input: { path: join(cwd, '.env') } });
  assert.equal(denial?.block, true, 'secret reads must be denied');
  console.log('PASS: sensitive-file permission gate');

  await session.prompt('CASE:write');
  assert.equal(await readFile(join(cwd, 'result.txt'), 'utf8'), 'written by real Pi tool\n');
  await session.prompt('/undo');
  assert.equal(existsSync(join(cwd, 'result.txt')), false, `undo must restore files: ${JSON.stringify(notices)}`);
  await session.prompt('/redo');
  assert.equal(await readFile(join(cwd, 'result.txt'), 'utf8'), 'written by real Pi tool\n');
  console.log('PASS: real file write, undo, and redo');

  await session.prompt('/plan start');
  await session.prompt('CASE:plan-write');
  assert.equal(existsSync(join(cwd, 'forbidden.txt')), false, 'Plan mode must block writes');
  await session.prompt('/plan exit');
  console.log('PASS: Plan mode blocks a real attempted write');

  const count = prompts.length;
  await session.prompt('CASE:child');
  assert.ok(prompts.length > count, `child shell ask must reach parent UI: ${JSON.stringify(session.messages).slice(-2000)}`);
  assert.equal(await readFile(join(cwd, 'child.txt'), 'utf8'), 'child-approved', 'approved child command must execute');
  console.log('PASS: subagent shell approval reaches parent UI');

  const completed = new Promise((resolve, reject) => {
    const watcher = watch(cwd, () => {
      if (existsSync(join(cwd, 'background.txt'))) { clearTimeout(timer); watcher.close(); resolve(); }
    });
    const timer = setTimeout(() => { watcher.close(); reject(new Error('Background command did not complete')); }, 10000);
  });
  await session.prompt('CASE:background');
  await completed;
  assert.equal(await readFile(join(cwd, 'background.txt'), 'utf8'), 'background-ready');
  console.log('PASS: background shell executes through the permission gate');

  const brokenAgent = join(fixture, 'broken-agent');
  const brokenExtension = join(fixture, 'broken.ts');
  await writeFile(brokenExtension, 'export default function () { throw new Error("deliberate load failure"); }');
  await save(join(brokenAgent, 'settings.json'), { extensions: [brokenExtension] });
  await assert.rejects(loadChecked({ runtime, agentDir: brokenAgent, cwd }), /deliberate load failure/);
  await save(join(brokenAgent, 'settings.json'), {});
  await assert.rejects(loadChecked({ runtime, agentDir: brokenAgent, cwd, requiredPackages: ['@gotgenes/pi-permission-system'] }), /Required extension is disabled or missing/);
  await writeFile(join(brokenAgent, 'settings.json'), '{broken');
  await assert.rejects(loadChecked({ runtime, agentDir: brokenAgent, cwd }), SyntaxError);
  console.log('PASS: a broken extension stops managed launch');
  assert.deepEqual(errors, [], 'no extension runtime errors');
  console.log(`PASS: ${calls} local model responses; no paid model requests`);
} finally {
  await session.extensionRunner.emit({ type: 'session_shutdown', reason: 'quit' });
  session.dispose();
  await rm(fixture, { recursive: true, force: true });
}
