import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const required = {
  planning: ['plan_mode_complete'], subagents: ['subagent'], web: ['web_search', 'fetch_content'],
  questions: ['ask_user_question'], background: ['bash_output'], todos: ['todo'],
  codeIntelligence: ['lens_diagnostics'], browser: ['agent_browser'],
};
const commands = { planning: ['plan'], permissions: ['permission-system'], history: ['undo', 'redo'],
  background: ['bg'], sideQuestions: ['btw'], worktrees: ['worktree'], todos: ['todos'], visualPlans: ['plannotator-review'] };

export async function inspectPi(agentDir, features, pi = 'pi') {
  const cwd = await mkdtemp(join(tmpdir(), 'pi-setup-check-'));
  try {
    return await new Promise((resolveCheck, reject) => {
      const child = spawn(pi, ['--mode', 'rpc', '--no-session', '--no-approve', '-e', fileURLToPath(new URL('./probe.ts', import.meta.url))],
        { cwd, env: { ...process.env, PI_CODING_AGENT_DIR: agentDir }, stdio: ['pipe', 'pipe', 'pipe'] });
      let buffer = '', errors = '', result;
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Pi diagnostic timed out. Check pi --version and your extensions.')); }, 45000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.stderr.on('data', data => { errors += data; });
      child.stdout.on('data', data => {
        buffer += data;
        let index;
        while ((index = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
          try {
            const record = JSON.parse(line);
            if (record.type === 'extension_ui_request' && record.method === 'notify' && record.message?.startsWith('PI_SETUP_CHECK ')) {
              result = JSON.parse(record.message.slice('PI_SETUP_CHECK '.length));
              child.stdin.end();
            }
            if (record.type === 'extension_error') errors += 'An extension reported an error.\n';
          } catch { /* Other startup output is not a diagnostic record. */ }
        }
      });
      child.on('close', code => {
        clearTimeout(timer);
        if (code !== 0 || !result || /failed to load|extension.*error/i.test(errors)) return reject(new Error(`Pi could not load the configured extensions.\n${errors.slice(-4000)}`));
        for (const [feature, enabled] of Object.entries(features)) {
          if (!enabled) continue;
          for (const name of required[feature] ?? []) if (!result.tools.includes(name)) return reject(new Error(`${feature}: missing tool ${name}`));
          for (const name of commands[feature] ?? []) if (!result.commands.includes(name)) return reject(new Error(`${feature}: missing command /${name}`));
        }
        resolveCheck(result);
      });
    });
  } finally { await rm(cwd, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const agentDir = resolve(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi/agent'));
  const installed = JSON.parse(await readFile(join(agentDir, 'pi-setup.json'), 'utf8'));
  const result = await inspectPi(agentDir, installed.features);
  console.log(`Pi check passed: ${Object.values(installed.features).filter(Boolean).length} features; ${result.tools.length} registered tools.`);
}
