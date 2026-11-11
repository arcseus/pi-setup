# Pi setup

Configure an existing Pi installation with 13 coding features. Pi stays on your normal `PATH`, and setup uses your existing login, sessions, models, and settings. All features are selected by default.

Supported: macOS and Linux. Tested with Pi **1.5.2** and Node.js **24.22.2**. Setup accepts Pi 1.x from 1.5.2 onward; Pi 2.x is not supported yet.

## 1. Install the prerequisites

Install [Node.js 24 LTS](https://nodejs.org/en/download) **24.22.2 or newer**, npm, and Git. Node must be new enough for the browser extension, even if your existing Pi works on an older Node.

Check your terminal:

```bash
node --version
npm --version
git --version
```

If you already use nvm, select Node 24 with `nvm install 24` followed by `nvm use 24`. Use `nvm alias default 24` if new terminals should use it automatically.

Install the tested Pi version into your user account:

```bash
npm install --global --prefix "$HOME/.local" --ignore-scripts @earendil-works/pi-coding-agent@1.5.2
export PATH="$HOME/.local/bin:$PATH"
pi --version
```

Add the `export PATH=...` line to `~/.bashrc` for Bash or `~/.zshrc` for Zsh so Pi is available in new terminals. This user-level installation needs no `sudo`. The npm installation method is documented in [Pi's official quickstart](https://pi.dev/docs/latest/quickstart).

**Already have Pi?** Keep your existing installation if `pi --version` reports a supported version and `node --version` meets the requirement. Include `$HOME/.local/bin` on `PATH` as above: setup uses it to install the browser CLI if that command is missing. Setup does not install, replace, or upgrade Pi or Node.

## 2. Run setup

Clone or download this repository. From its directory, run:

```bash
./setup.sh
```

Setup installs the selected extensions through `pi install`, adds their configuration to `~/.pi/agent/`, downloads Chrome for browser automation, and checks that Pi can load the expected tools and commands. It prints `Ready` when verification passes.

If Pi is already open, restart it or run `/reload` after setup.

## 3. Start coding

Use your normal Pi command from any project:

```bash
cd /path/to/your/project
pi
```

For a new Pi installation, run `/login`, choose a provider, and follow its sign-in or API-key prompts. Use `/model` to select a model. Existing Pi credentials are reused automatically.

Try a first task:

```text
Explain this repository and how to run its tests.
```

For a larger change, start with `/plan`. For a quick side question, use `/btw`.

## Included features

| Config key | Package | How to use it |
|---|---|---|
| `planning` | `@narumitw/pi-plan-mode` | `/plan` |
| `subagents` | `@gotgenes/pi-subagents` | Ask Pi to delegate; `/subagents:settings` |
| `permissions` | `@gotgenes/pi-permission-system` | `/permission-system` |
| `web` | `pi-web-access` | Ask Pi to search the web or fetch a URL |
| `questions` | `@juicesharp/rpiv-ask-user-question` | Pi can present structured choices |
| `history` | `pi-workspace-history` | `/undo`, `/redo`, `/diff` |
| `background` | `pi-bg-bash` | Ask for a background command; `/bg` |
| `sideQuestions` | `@narumitw/pi-btw` | `/btw` |
| `worktrees` | `@narumitw/pi-worktree` | `/worktree` |
| `todos` | `@juicesharp/rpiv-todo` | `/todos` |
| `codeIntelligence` | `pi-lens` | `/lens-health`, `/lens-tools` |
| `visualPlans` | `@plannotator/pi-extension` | `/plannotator-review`, `/plannotator-plan-mode` |
| `browser` | `pi-agent-browser-native` | Ask Pi to open and inspect a page |

Pi's built-in MCP, code mode, and search tools are also enabled. Web search initially uses keyless Exa; you can change providers in `~/.pi/agent/web-search.json`.

Subagents use the permission author's integrated dispatcher so child approvals reach the parent UI. They default to four concurrent runs and 30 turns. Parent-only planning, history, and UI extensions are excluded from children; permissions remain active. The `/btw` implementation does not execute tools.

## Choose features

Change any value in `config.json` from `"install"` to `"skip"`, then run setup again:

```json
{
  "features": {
    "browser": "skip",
    "visualPlans": "skip"
  }
}
```

Omitted features default to `"install"`. You can also supply a separate config:

```bash
./setup.sh /path/to/my-config.json
```

`"skip"` removes that feature's package registration. It keeps credentials, preferences, and cached downloads. Setup leaves unrelated packages and model preferences in place, and restores the selected packages to the pinned versions declared in `package.json`.

## Verify and troubleshoot

From this repository, run:

```bash
npm run doctor
```

This starts Pi briefly, checks registrations, and exits without sending a model request. Run `pi list` in your shell to list packages. Inside Pi, `/permission-system` manages approval rules and `/lens-health` reports language tooling.

- **`pi: command not found`:** run `export PATH="$HOME/.local/bin:$PATH"`, then check `command -v pi`. Remove any old PATH entry pointing at this repository's former launcher.
- **Node/Pi version error:** update the prerequisite named in the error, then rerun setup. If you have several installations, `type -a pi` shows command precedence.
- **Conflicting extension:** setup stops before changing settings and names the conflict. Use `pi list` and `pi remove <source>` to remove the old implementation, or skip the corresponding feature here. Disabled alternatives with an empty `extensions` list are ignored.
- **Missing browser libraries on Linux:** run `agent-browser install --with-deps`. This may request administrator access for OS libraries. Chrome is cached in `~/.agent-browser/`.
- **No language-server diagnostics:** install your project's language server, compiler, formatter, or linter as appropriate; `/lens-health` reports what is missing. This repository does not install every language toolchain.
- **Model/search service unavailable:** check provider credentials, connectivity, and service limits. The installation check does not validate a paid model account or external search quota.

## Settings and recovery

Setup uses `~/.pi/agent/`, or the directory selected by `PI_CODING_AGENT_DIR`. It never writes `auth.json` or existing sessions. Existing permission and web-provider files are preserved; subagent defaults are merged with your preferences.

Before changes, setup backs up affected existing configuration under `~/.pi/agent/pi-setup-backups/<timestamp>/`. If an install or verification step fails, it restores the configuration it changed. Downloaded packages and Chrome may remain cached. Close other Pi sessions while running setup to avoid simultaneous settings edits.

The default policy allows ordinary file edits, asks for most shell commands and outside-project access, allows routine Git inspection, and blocks sensitive environment/key paths. Customize `extensions/pi-permission-system/config.json` under the agent directory. These are tool approval gates; Pi still runs with your operating-system permissions.

To test in a separate Pi profile without changing your normal settings:

```bash
PI_CODING_AGENT_DIR="$HOME/.pi-test/agent" ./setup.sh
PI_CODING_AGENT_DIR="$HOME/.pi-test/agent" pi
```

New profiles need their own `/login`. Old installations of this repository used `.local/agent/`; setup does not automatically copy those credentials or sessions into your normal Pi profile.

## Development

```bash
npm test
```

The SDK integration tests require the npm-installed Pi from step 1 and a profile configured with all 13 features. They use temporary projects and an in-process fixture model to check writes, undo/redo, planning restrictions, permissions, child approvals, and background execution without paid model requests.

Extension versions are pinned in `package.json`. Pi manages their dependencies; this repository does not promise a frozen transitive dependency tree. Update a pin, rerun setup, and test before sharing the change. The original comparison is retained in [RESEARCH.md](RESEARCH.md).
