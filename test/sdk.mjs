import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, realpath, access } from 'node:fs/promises';
import { existsSync, constants } from 'node:fs';
import { dirname, delimiter } from 'node:path';
import { packageName } from '../lib/config.mjs';

export async function installedPiRoot() {
  for (const directory of process.env.PATH.split(delimiter)) {
    const binary = join(directory, 'pi');
    try { await access(binary, constants.X_OK); } catch { continue; }
    let path = dirname(await realpath(binary));
    while (dirname(path) !== path) {
      const file = join(path, 'package.json');
      if (existsSync(file) && JSON.parse(await readFile(file, 'utf8')).name === '@earendil-works/pi-coding-agent') return path;
      path = dirname(path);
    }
  }
  throw new Error('SDK integration tests require an npm-installed Pi on PATH. See README.md.');
}

export async function loadChecked({ runtime, agentDir, cwd, requiredPackages = [] }) {
  // Pi can recover from malformed settings by dropping them; a managed setup must stop instead.
  JSON.parse(await readFile(join(agentDir, 'settings.json'), 'utf8'));
  const sdk = await import(pathToFileURL(join(runtime, 'dist/index.js')));
  const loader = new sdk.DefaultResourceLoader({
    cwd, agentDir,
    extensionFactories: [sdk.createCodemodeExtension(), sdk.createToolSearchExtension(), sdk.createMcpExtension()],
  });
  await loader.reload();
  const errors = loader.getExtensions().errors;
  if (errors.length) throw new Error(`Extension loading failed:\n${errors.map(e => `${e.path}: ${e.error}`).join('\n')}`);
  for (const name of requiredPackages) {
    const marker = `/node_modules/${packageName(name) ?? name}`;
    if (!loader.getExtensions().extensions.some(extension => extension.path.endsWith(marker) || extension.path.includes(`${marker}/`))) {
      throw new Error(`Required extension is disabled or missing: ${name}. Rerun ./setup.sh after changing config.json.`);
    }
  }
  return { sdk, loader };
}
