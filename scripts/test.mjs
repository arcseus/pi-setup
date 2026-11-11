import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
for (const args of [['--test', 'test/config.test.mjs', 'test/setup.test.mjs'], ['test/smoke.mjs']]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', timeout: 120000 });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`Tests failed (${result.status})`);
}
