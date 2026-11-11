import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFeatures, makeSettings, checkVersion, findConflicts, packageName } from '../lib/config.mjs';
import { inspectPi } from './doctor.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.length > 1 || args[0]?.startsWith('-')) throw new Error('Usage: ./setup.sh [config.json]');
const run = (command, argv, capture = false) => {
  const result = spawnSync(command, argv, { cwd: root, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') throw new Error(`${command} must be installed and on PATH. See README.md.`);
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} failed (${result.status})`);
  return result.stdout?.trim();
};
checkVersion('Node', process.version, manifest.piSetup.minNode);
const piVersion = run('pi', ['--version'], true);
checkVersion('Pi', piVersion, manifest.piSetup.minPi, 2);
run('npm', ['--version'], true); run('git', ['--version'], true);
if (!['linux', 'darwin'].includes(process.platform)) throw new Error('This setup supports macOS and Linux.');
const features = resolveFeatures(JSON.parse(await readFile(resolve(args[0] ?? join(root, 'config.json')), 'utf8')), manifest);
const agentDir = resolve(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi/agent'));
process.env.PI_CODING_AGENT_DIR = agentDir;
const settingsPath = join(agentDir, 'settings.json');
const json = async (path, fallback = {}) => existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : fallback;
const previous = await json(settingsPath);
const conflicts = findConflicts(previous, features);
if (conflicts.length) throw new Error(`Conflicting extensions: ${conflicts.join(', ')}. Remove them with pi remove before running setup; your settings have not been changed.`);
const next = makeSettings(features, manifest, previous);
const binDir = join(homedir(), '.local/bin');
const browser = features.browser && spawnSync('agent-browser', ['--version'], { encoding: 'utf8' });
const haveBrowser = browser && browser.status === 0;
if (haveBrowser) checkVersion('agent-browser', browser.stdout.match(/\d+\.\d+\.\d+/)?.[0] ?? 'unknown', '0.35.0');
if (features.browser && !haveBrowser && !process.env.PATH.split(delimiter).some(path => resolve(path) === binDir)) {
  throw new Error(`Browser installation needs ${binDir} on PATH. Add export PATH="$HOME/.local/bin:$PATH" to your shell, then rerun setup.`);
}
await mkdir(agentDir, { recursive: true });
const lock = join(agentDir, '.pi-setup.lock');
try { await mkdir(lock); } catch { throw new Error(`Another setup is running. If it was interrupted, remove ${lock} and retry.`); }
const backupDir = join(agentDir, 'pi-setup-backups', new Date().toISOString().replaceAll(':', '-') + `-${process.pid}`);
const originals = new Map();
const save = async (path, value) => {
  if (!originals.has(path)) {
    const original = existsSync(path) ? await readFile(path) : null;
    originals.set(path, original);
    if (original) { const backup = join(backupDir, path.slice(agentDir.length + 1)); await mkdir(dirname(backup), { recursive: true }); await writeFile(backup, original, { mode: 0o600 }); }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(`${path}.tmp`, path);
};
try {
  // Back up settings before Pi's own installer edits them.
  await save(settingsPath, previous);
  const selected = Object.entries(manifest.piSetup.features).filter(([key]) => features[key]);
  console.log(`Configuring installed Pi ${piVersion}: ${selected.length}/13 features in ${agentDir}`);
  for (const [, source] of selected) run('pi', ['install', source, '--no-approve']);
  await save(settingsPath, next);
  const seed = async (relative, value) => { const path = join(agentDir, relative); if (!existsSync(path)) await save(path, value); };
  if (features.permissions) await seed('extensions/pi-permission-system/config.json', { permission: {
    '*': 'allow', path: { '*': 'allow', '*.env': 'deny', '*.env.*': 'deny', '*.env.example': 'allow', '~/.ssh/*': 'deny', '~/.aws/*': 'deny' },
    bash: { '*': 'ask', 'git status*': 'allow', 'git diff*': 'allow', 'git log*': 'allow' }, external_directory: 'ask',
  } });
  if (features.web) await seed('web-search.json', { provider: 'exa' });
  if (features.subagents) {
    const path = join(agentDir, 'subagents.json');
    const old = await json(path);
    const scoped = ['planning', 'history', 'background', 'sideQuestions', 'worktrees', 'todos', 'codeIntelligence', 'visualPlans', 'browser'].map(key => manifest.piSetup.features[key]);
    const names = new Set(scoped.map(packageName));
    await save(path, { maxConcurrent: 4, defaultMaxTurns: 30, ...old,
      excludedExtensionPackages: [...(old.excludedExtensionPackages ?? []).filter(source => !names.has(packageName(source))), ...scoped.filter(source => next.packages.includes(source))] });
  }
  if (features.browser) {
    if (!haveBrowser) run('npm', ['install', '--global', '--prefix', join(homedir(), '.local'), '--ignore-scripts', '--no-audit', '--no-fund', manifest.piSetup.browser]);
    run('agent-browser', ['install']);
  }
  await inspectPi(agentDir, features);
  await save(join(agentDir, 'pi-setup.json'), { features, piVersion });
  console.log('\nReady. Run pi from your project. Existing login and sessions are preserved.');
  if (existsSync(backupDir)) console.log(`Settings backup: ${backupDir}`);
} catch (error) {
  for (const [path, original] of originals) {
    if (original === null) await rm(path, { force: true });
    else await writeFile(path, original, { mode: 0o600 });
  }
  throw error;
} finally { await rm(lock, { recursive: true, force: true }); }
