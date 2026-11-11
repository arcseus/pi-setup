import { readFile } from 'node:fs/promises';

export async function readJson(path, fallback) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected a JSON object');
    return value;
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    if (error.code === 'ENOENT') throw new Error(`Missing file: ${path}. Check the path and rerun setup.`);
    if (['EACCES', 'EPERM'].includes(error.code)) throw new Error(`Cannot read ${path}. Check its owner and permissions; run setup as your normal user.`);
    throw new Error(`Cannot read JSON in ${path}. Fix the file before retrying. Its contents have not been changed.`);
  }
}

export function reportError(error) {
  console.error(`\nError: ${error.message}`);
  if (['EACCES', 'EPERM'].includes(error.code)) console.error('Check file ownership and permissions. Run setup as your normal user, not with sudo.');
  if (process.env.PI_SETUP_DEBUG) console.error(error.stack);
  process.exitCode = 1;
}
