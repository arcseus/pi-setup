import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFeatures, makeSettings, checkVersion, findConflicts, packageName, validateSettings } from '../lib/config.mjs';
import { inspectPi } from './doctor.mjs';

import { readJson, reportError } from '../lib/errors.mjs';

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = await readJson(join(root, 'package.json'));
  const args = process.argv.slice(2);
  if (args.length > 1 || args[0]?.startsWith('-')) throw new Error('Usage: ./setup.sh [config.json]');
  const run = (command, argv, capture = false) => {
    const result = spawnSync(command, argv, { cwd: root, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') throw new Error(`${command} must be installed and on PATH. See README.md.`);
    if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} ${argv.join(' ')} failed (${result.signal ? `signal ${result.signal}` : `exit ${result.status}`}). See the output above; check network/proxy access and npm permissions, then rerun setup.`);
    return result.stdout?.trim();
  };
  checkVersion('Node', process.version, manifest.piSetup.minNode);
  const piVersion = run('pi', ['--version'], true);
  checkVersion('Pi', piVersion, manifest.piSetup.minPi, 2);
  run('npm', ['--version'], true); run('git', ['--version'], true);
  if (!['linux', 'darwin'].includes(process.platform)) throw new Error('This setup supports macOS and Linux.');
  const features = resolveFeatures(await readJson(resolve(args[0] ?? join(root, 'config.json'))), manifest);
  const agentDir = resolve(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi/agent'));
  process.env.PI_CODING_AGENT_DIR = agentDir;
  const settingsPath = join(agentDir, 'settings.json');
  const json = (path, fallback = {}) => readJson(path, fallback);
  const previous = await json(settingsPath);
  const conflicts = findConflicts(previous, features);
  if (conflicts.length) throw new Error(`Conflicting extensions: ${conflicts.join(', ')}. Run pi config and disable their extensions, or remove their package registrations with pi remove, before rerunning setup; your settings have not been changed.`);
  const next = makeSettings(features, manifest, previous);
  await mkdir(agentDir, { recursive: true });
  const lock = join(agentDir, '.pi-setup.lock');
  try { await mkdir(lock); } catch (error) { if (error.code !== 'EEXIST') throw error; throw new Error(`Another setup is running. If it was interrupted, remove ${lock} and retry.`); }
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
    console.log(`Configuring installed Pi ${piVersion}: ${selected.length}/${Object.keys(manifest.piSetup.features).length} features in ${agentDir}`);
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
      validateSettings(old);
      const scoped = ['planning', 'history', 'background', 'sideQuestions', 'worktrees', 'todos', 'codeIntelligence', 'visualPlans'].map(key => manifest.piSetup.features[key]);
      const names = new Set(scoped.map(packageName));
      await save(path, { maxConcurrent: 4, defaultMaxTurns: 30, ...old,
        excludedExtensionPackages: [...(old.excludedExtensionPackages ?? []).filter(source => !names.has(packageName(source))), ...scoped.filter(source => next.packages.includes(source))] });
    }
    await inspectPi(agentDir, features);
    await save(join(agentDir, 'pi-setup.json'), { features, piVersion });
    console.log('\nReady. Run pi from your project. Existing login and sessions are preserved.');
    if (existsSync(backupDir)) console.log(`Settings backup: ${backupDir}`);
  } catch (error) {
    const failures = [];
    for (const [path, original] of originals) {
      try {
        if (original === null) await rm(path, { force: true });
        else await writeFile(path, original, { mode: 0o600 });
      } catch { failures.push(path); }
    }
    console.error(failures.length ? `Could not restore: ${failures.join(', ')}. Backups: ${backupDir}` : 'Configuration restored. Downloaded packages may remain cached.');
    throw error;
  } finally { await rm(lock, { recursive: true, force: true }); }

}
main().catch(reportError);
