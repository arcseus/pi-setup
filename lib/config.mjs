export function resolveFeatures(config, manifest) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Config must be an object');
  const choices = config.features ?? {};
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) throw new Error('features must be an object');
  for (const [key, value] of Object.entries(choices)) {
    if (key === 'browser' && ['install', 'skip'].includes(value)) continue; // Retired feature in older configs.
    if (!Object.hasOwn(manifest.piSetup.features, key)) throw new Error(`Unknown feature: ${key}`);
    if (!['install', 'skip'].includes(value)) throw new Error(`${key}: use "install" or "skip"`);
  }
  return Object.fromEntries(Object.keys(manifest.piSetup.features).map(key => [key, choices[key] !== 'skip']));
}

export function packageName(item) {
  const source = typeof item === 'string' ? item : item?.source;
  if (typeof source !== 'string') return undefined;
  if (source.startsWith('npm:')) return source.slice(4).match(/^(@[^/]+\/[^@]+|[^@]+)(?:@.*)?$/)?.[1];
  const marker = '/node_modules/';
  return source.includes(marker) ? source.slice(source.lastIndexOf(marker) + marker.length).replace(/\/$/, '') : undefined;
}

export function makeSettings(features, manifest, previous = {}) {
  validateSettings(previous);
  const managed = new Set([...Object.values(manifest.piSetup.features).map(packageName), 'pi-agent-browser-native']);
  const tools = previous.defaultTools ?? [];
  if (!Array.isArray(tools) || tools.some(t => typeof t !== 'string')) throw new Error('defaultTools must be an array of strings');
  const prefix = tools.length && tools.some(t => !/^[+-]/.test(t)) ? '' : '+';
  return {
    ...previous,
    defaultTools: [...new Set([...tools, ...['grep', 'find', 'ls', 'codemode', 'tool_search'].map(name => `${prefix}${name}`)])],
    packages: [...(previous.packages ?? []).filter(item => !managed.has(packageName(item))),
      ...Object.entries(manifest.piSetup.features).filter(([key]) => features[key]).map(([, source]) => source)],
  };
}

export function checkVersion(name, actual, minimum, maxMajor) {
  const match = actual.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  const parts = match?.slice(1).map(Number);
  const floor = minimum.split('.').map(Number);
  const difference = parts?.map((value, index) => value - floor[index]).find(value => value !== 0) ?? 0;
  if (!parts || difference < 0 || (maxMajor && parts[0] >= maxMajor)) {
    throw new Error(`${name} ${minimum}+${maxMajor ? ` (below ${maxMajor}.0.0)` : ''} required; found ${actual.trim()}. See README.md.`);
  }
}

export function findConflicts(settings, features) {
  validateSettings(settings);
  const alternatives = {
    web: ['@ollama/pi-web-search'],
    subagents: ['pi-subagents', 'pi-open-agents', '@johnnywu/pi-subagents'],
    permissions: ['pi-permission-system', 'pi-permission-modes', 'pi-sandbox'],
    sideQuestions: ['pi-btw'],
    history: ['pi-rewind', 'pi-rewind-hook', '@ayulab/pi-rewind', 'pi-checkpoints'],
    background: ['pi-bg-tasks', 'pi-background-tasks'],
    codeIntelligence: ['@narumitw/pi-lsp', 'pi-lsp', 'pi-lsp-adapter'],
  };
  const conflicting = new Set(['pi-mcp-adapter', 'pi-mcp-extension']);
  for (const [feature, names] of Object.entries(alternatives)) if (features[feature]) names.forEach(name => conflicting.add(name));
  const packages = (settings.packages ?? []).filter(item => !(typeof item === 'object' && Array.isArray(item.extensions) && item.extensions.length === 0))
    .map(packageName).filter(name => conflicting.has(name));
  const entries = settings.extensions ?? [];
  const extensions = entries.filter(path => typeof path === 'string' && !/^[!-]/.test(path))
    .map(path => path.replace(/^\+/, '')).filter(path => !entries.includes(`-${path}`));
  for (const name of conflicting) {
    if (extensions.some(path => path.includes(`/node_modules/${name}/`))) packages.push(name);
  }
  return [...new Set(packages)];
}

export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Settings must be a JSON object.');
  for (const key of ['packages', 'extensions', 'defaultTools', 'excludedExtensionPackages']) {
    if (settings[key] !== undefined && (!Array.isArray(settings[key]) || settings[key].some(item =>
      key === 'packages' ? !(typeof item === 'string' || (item && typeof item === 'object' && typeof item.source === 'string')) : typeof item !== 'string'))) {
      throw new Error(`${key} must be an array of ${key === 'packages' ? 'package sources' : 'strings'}.`);
    }
  }
}
