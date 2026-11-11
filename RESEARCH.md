**Pi versus OpenCode CLI: feasibility and extension research**

Research date: 11 November 2026. Scope: the latest OpenCode CLI, as clarified by the user; desktop and web interfaces are excluded from the target. Public npm `latest` metadata returned OpenCode `@opencode/cli` 2.2.7 and Pi `@earendil-works/pi-coding-agent` 1.5.2. Versions and downloads below are a dated snapshot.

**Assessment**

A configurable installer is straightforward. A useful Pi environment covering most everyday OpenCode CLI workflows is feasible with existing extensions. Delivering identical behavior across the entire CLI, with comparable onboarding and update reliability, takes integration and maintenance work.

The strongest argument for Pi is that a team can publish and maintain one curated environment so ordinary developers never need to assemble it themselves. The strongest argument for OpenCode is that its maintainers already own the integration between the main features. Professional suitability depends on who owns that work, how the tools behave on the team's repositories, and whether customization produces enough value to justify it.

These conclusions come from official documentation, published npm manifests, extension documentation, and selected source inspection. No extensions were installed or executed, and no live model, latency, coding-quality, or combined-extension benchmark was performed. Candidate versions are **not a certified compatible distribution**.

**Version corrections that materially affect the debate**

- Current Pi uses the `@earendil-works` scope. The old `@mariozechner/pi-coding-agent` npm `latest` is 0.73.1. Current Pi requires Node 22.19 or newer. See the [Pi README](https://github.com/earendil-works/pi/tree/main/packages/coding-agent) and the [published Pi manifest](https://registry.npmjs.org/@earendil-works/pi-coding-agent/latest).
- Pi now has built-in MCP, including stdio, streamable HTTP, OAuth, resource access, and configurable tool exposure. An MCP extension is unnecessary for normal new installations. Legacy SSE is an exception. See [Pi MCP](https://pi.dev/docs/latest/mcp).
- OpenCode v2 currently accepts LSP configuration but does not run language servers, expose LSP tools, or supply LSP diagnostics. Its current formatter definitions are available but formatting is disabled by default. LSP and formatting should therefore be distinguished in the comparison. See [OpenCode migration](https://opencode.ai/docs/migrate-v1/) and [formatters](https://opencode.ai/docs/formatters/).
- OpenCode's default Build permissions broadly allow tools, with approval for certain environment-file reads. Having a permission engine does not mean every potentially dangerous action prompts by default. Its shell runs with the host user's authority. See [OpenCode permissions](https://opencode.ai/docs/permissions/).

**What Pi already supplies**

| Capability | Pi path | Installer work |
|---|---|---|
| Read, edit, write, shell | Native tools | Set normal defaults |
| File search and directory listing | Native `grep`, `find`, `ls`, optional in the active toolset | Enable them if matching OpenCode's explicit tools is desired |
| Providers, authentication, model switching | Native provider configuration and login | Configure the team's actual endpoint and model IDs |
| Instructions and skills | Native project instructions and skills | Distribute team resources |
| Slash prompts | Native Markdown prompt templates | Port useful commands |
| Sessions, resume, branches | Native persistent tree history | Teach equivalent commands |
| Context compaction | Native | Tune only after measuring |
| Steering and follow-up messages | Native | Explain keyboard differences |
| MCP and tool discovery | Native | Supply server configuration and credentials |
| Programmatic parallel tool orchestration | Native `codemode` | Enable it when useful |
| Script and application integration | Print, JSON, RPC, SDK | Select the appropriate interface |
| Terminal themes and UI customization | Native configuration and extension APIs | Optional team defaults |

These features are described in [how Pi works](https://pi.dev/docs/latest/how-pi-works), [CLI reference](https://pi.dev/docs/latest/cli), [model setup](https://pi.dev/docs/latest/models), and [MCP reference](https://pi.dev/docs/latest/mcp). Native session navigation does not itself restore working-tree files.

**Extension candidates**

Popularity means approximate monthly downloads displayed in the official Pi catalog during research. Downloads include automation and repeat installations, and some packages serve several agent clients. They are discovery signals, not unique-user counts, quality scores, or proof of compatibility. Search results also include unrelated bundles, so a high position in a keyword search does not establish the best implementation of a feature.

| OpenCode capability or useful addition | Candidate and observed version | Approximate downloads/month | Assessment |
|---|---|---:|---|
| Plan/Build workflow | [`@narumitw/pi-plan-mode`](https://pi.dev/packages/@narumitw/pi-plan-mode) 0.60.0 | 30.5K | Preferred terminal planning candidate: inspection, questions, explicit plan completion, review, same-session or fresh-session implementation |
| Foreground/background delegation | [`pi-subagents`](https://pi.dev/packages/pi-subagents) 0.88.0 | 888K | Strong popularity signal; ready-made roles and extensive orchestration; child policy needs explicit integration |
| Human allow/ask/deny gates | [`@gotgenes/pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) 42.0.0 | 44–46K | Broad tool, command, path, MCP, and skill policy; configure it, including child sessions |
| Web search and fetch | [`pi-web-access`](https://github.com/nicobailon/pi-web-access) 0.47.0 | 1.3M | Strong starting candidate; supports no-key Exa search as well as configured providers; choose routing deliberately |
| Structured questions | [`@juicesharp/rpiv-ask-user-question`](https://pi.dev/packages/@juicesharp/rpiv-ask-user-question) 2.15.0 | 178K | General questionnaire tool outside planning; planning already has its own questions |
| File and conversation undo/redo | [`pi-workspace-history`](https://pi.dev/packages/pi-workspace-history) 0.5.2 | 3.5K | Closest command vocabulary to OpenCode; separate history store, shell-made changes, dirty-state protection; validate exclusions and recovery |
| Background shell commands | [`pi-bg-bash`](https://pi.dev/packages/pi-bg-bash) 0.6.0 | 1.2K | Focused implementation targeting Pi >=1.5.0; macOS/Linux only; replaces `bash` |
| Side questions | [`pi-btw`](https://pi.dev/packages/pi-btw) 0.8.1 | 40.1K | Popular but default side sessions have editing tools; `/btw:ask` is a closer inspection-only option |
| Side questions alternative | [`@narumitw/pi-btw`](https://pi.dev/packages/@narumitw/pi-btw) 0.63.7 | 20.9K | Closer starting point for a dedicated question thread; choose one `/btw` implementation |
| Main-session worktree management | [`@narumitw/pi-worktree`](https://pi.dev/packages/@narumitw/pi-worktree) 0.51.9 | 755 | Interactive creation, switching, removal, and pruning; not an exact substitute for OpenCode's agent-callable worktree namespace |
| Optional visible task list | [`@juicesharp/rpiv-todo`](https://pi.dev/packages/@juicesharp/rpiv-todo) 2.15.0 | 99.1K | Persistent task display; optional because current OpenCode todos are experimental and disabled unless enabled |
| Optional LSP, linting, formatting | [`pi-lens`](https://pi.dev/packages/pi-lens) 4.4.12 | 94.5K | Broad functionality; substantial policy and behavior beyond an LSP client; use as a separate profile |
| Narrower LSP alternative | [`@narumitw/pi-lsp`](https://github.com/narumiruna/pi-extensions/tree/main/packages/pi-lsp) 0.49.12 | Roughly 8–10K | Evaluate for teams that want language-server tools without the broader lens workflow |
| Visual plan annotation | [`@plannotator/pi-extension`](https://github.com/backnotprop/plannotator/tree/main/apps/pi-extension) 0.28.61 | 95.2K | Popular planning/review option, but opens a browser workflow; optional for this CLI-focused target |
| Optional browser automation | [`pi-agent-browser-native`](https://pi.dev/packages/pi-agent-browser-native) 0.9.18 | 23.9K | Requires Node >=24.21.0 plus its browser runtime setup; unnecessary for core CLI parity |

The full npm manifest snapshot, including runtime floors, peer ranges, source repositories, and tarball integrity metadata, is in `package-inventory.json`. It records static evidence, not installation results.

**Choose an agent architecture deliberately**

`pi-subagents` covers delegation, but installing it does not add arbitrary primary-agent switching equivalent to OpenCode's named primary profiles. Plan/Build switching is only one specific workflow.

If reusing OpenCode agent definitions and switching primary profiles are important, evaluate [`pi-open-agents`](https://github.com/andrea-tomassi/pi-open-agents) 0.1.32 instead. It combines primary profiles, subagent dispatch, and per-agent rules, with around 1.6K monthly downloads. This is less established by that metric than `pi-subagents`. Its documentation uses the older `permission:` schema; do not assume that all current OpenCode v2 `permissions:` arrays, request options, or execution semantics migrate unchanged.

Treat these as alternative architectures. Installing both delegation engines introduces overlapping `subagent` ownership and policy decisions. Likewise, [`@gotgenes/pi-subagents`](https://github.com/gotgenes/pi-packages/tree/main/packages/pi-subagents) is another candidate when native integration with that author's permission system matters more than choosing the most-downloaded dispatcher. That integration is documented by the [permission package](https://github.com/gotgenes/pi-packages/tree/main/packages/pi-permission-system); it does not prove equivalent behavior with every other dispatcher.

**Concrete integration issues found**

1. **The most popular MCP adapter is optional and changes the architecture.** `pi-mcp-adapter` has about 1.6M monthly downloads, but an extension registering `/mcp` replaces Pi's built-in session MCP implementation. Shell-level `pi mcp` still uses the built-in implementation. Installing the adapter automatically can therefore make commands and sessions consult different implementations. Use native MCP unless a specific requirement, such as legacy transport support, justifies a replacement. See [Pi's replacement rules](https://pi.dev/docs/latest/mcp).

2. **Parent permission hooks do not automatically protect every child.** Foreground `pi-subagents` children do not load the parent's ambient extensions. Its native child permission rules are opt-in; `ask` invokes a model arbiter rather than the human, and bash is passed through. Explicitly load and configure the required gate in child definitions or select an integrated architecture. Review-only roles should start with a small read-tool allowlist. See [agent selection](https://github.com/nicobailon/pi-subagents/blob/main/docs/agents.md) and [child permissions](https://github.com/nicobailon/pi-subagents/blob/main/docs/watchdog.md).

3. **The more-downloaded background package is not the obvious current-host choice.** `pi-background-tasks` has roughly 23.8K monthly downloads, but published version 2.6.10 declares host peer ranges limited to Pi 0.81–0.84. That is outside Pi 1.5.2's declared compatibility. It may or may not execute; this research did not test it. Its bundle also adds attribution behavior and delegation beyond background shell tasks. Prefer a current-host candidate or validate a port. See its [manifest](https://raw.githubusercontent.com/ismailsaleekh/pi-background-tasks/main/package.json).

4. **Same command name does not imply same authority.** OpenCode `/btw` asks a side question; popular Pi `pi-btw` starts a tool-enabled side agent by default. Use its `/btw:ask` route or a different implementation if users expect a question-only workflow. See [OpenCode TUI](https://opencode.ai/docs/cli/tui/) and [pi-btw](https://github.com/dbachelder/pi-btw).

5. **Rewind is a data-integrity feature.** `@ayulab/pi-rewind`, around 4.4K downloads/month, is more downloaded than `pi-workspace-history`, but documents restore paths that overwrite managed files without a dirty-workspace prompt. The selected history candidate documents refusing unsafe restores and excluding certain paths. These are different contracts. Neither should be installed alongside another automatic restore engine without deliberate testing. See [ayulab rewind](https://pi.dev/packages/@ayulab/pi-rewind) and [workspace history](https://github.com/wcldyx/pi-workspace-history).

6. **A sample extension is not necessarily a production subsystem.** Pi's `git-checkpoint.ts` example uses an in-memory map and `git stash create`/`apply`, then clears checkpoints when a run settles. It demonstrates hooks rather than full persistent OpenCode-style undo/redo. See the [example source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/git-checkpoint.ts).

7. **Code intelligence needs tools and workflow choices.** Language servers, compilers, linters, and formatters must exist for the team's actual languages. `pi-lens` includes additional guards, autofix, structural analysis, and diagnostics behavior. Start with repository checks, then add language-specific profiles. See [lens documentation](https://github.com/apmantza/pi-lens).

8. **Platform requirements differ.** A Node version adequate for Pi core may be too old for a chosen extension. `pi-bg-bash` excludes Windows. A single unqualified “works everywhere” installer would be misleading. See [background prerequisites](https://pi.dev/packages/pi-bg-bash) and [browser engine requirement](https://raw.githubusercontent.com/fitchmultz/pi-agent-browser-native/main/package.json).

9. **Approval and isolation are separate.** Pi extensions run inside the process and can invoke operating-system APIs directly. A tool hook reduces mistakes but is not process isolation. OpenCode's shell permission system also leaves the shell with host-user authority. If stronger isolation is required, apply it to the whole agent environment. [`pi-permission-modes`](https://github.com/wynainfo/pi-permission-modes) is an alternative combined mode/sandbox implementation, not an automatic extra to stack over other gate owners. Its Plan defaults allow Markdown changes and its documented fallback can be prompting-only, so it also needs explicit acceptance criteria. See [Pi security](https://pi.dev/docs/latest/security).

**A realistic initial profile**

Begin with Pi, native search tools, native MCP, and native codemode, plus planning, web access, structured questions, permissions, delegation, history, and background shell support. Add one side-question implementation when that workflow matters. This is approximately seven to eight focused extensions, not dozens.

Do not claim this profile is release-ready before the permission/child integration and rollback cases pass. An initial read-only delegation profile is a practical way to reduce the first release's scope while validating those paths.

Keep language-server/formatter tooling, todos, visual plan review, browser control, provider quota widgets, and notifications as optional feature groups. Select a separate primary-agent architecture if arbitrary OpenCode agent switching is required.

**Installer and configuration design**

The user-facing operation can be one command. Internally, it should consume a versioned manifest and publish a resolved installation report. A configuration might look like this; this is a proposed installer schema, not a Pi settings file or an implemented command:

```json
{
  "profile": "team-cli",
  "release": "2026-11-candidate",
  "features": {
    "planning": "install",
    "web": "install",
    "questions": "install",
    "permissions": "install",
    "delegation": "install",
    "history": "install",
    "backgroundShell": "install",
    "sideQuestions": "skip",
    "languageTools": "skip",
    "browser": "skip"
  }
}
```

For each feature, distinguish skipped, installed, enabled, configured, and verified. Installing an extension whose credentials or binaries are missing is not successful onboarding. Make a required-gate load failure stop the managed launcher rather than silently continuing without that gate.

Pi already supports versioned npm/git sources, local/project scope, package resources, and resource filters. For example, a selected version is installed with `pi install npm:pi-subagents@0.88.0`. `pi config` can enable and disable resources. A team can ship prompts, skills, themes, and owned glue as a Pi package while a bootstrap selects third-party packages. See [package management](https://pi.dev/docs/latest/packages).

For reproducibility, pin the Pi host and direct extension versions, preserve or otherwise control transitive resolutions, and record integrity. Exact direct package versions alone do not freeze their ranged dependencies. Pi's official installer documents pinned host dependencies; that does not automatically establish a complete extension lock. Publish upgrades as tested team releases.

A useful bootstrap should also preserve unrelated user settings, support repeat runs, preview changes, record owned configuration for removal, avoid overwriting authentication, explain missing setup, and restore the previous release after a failed upgrade. A small Node CLI is easier to extend across platforms than a growing Bash-only installer; language choice is an implementation judgment.

Do not fetch “the most popular package” at install time. The release manifest should name one reviewed implementation per feature. Popularity can help maintainers discover candidates before releasing an update.

**Coverage that remains partial**

- OpenCode CLI's integrated session tabs and shared background service have no identical Pi-core equivalent. Multiple terminal sessions, tmux, or an additional manager may satisfy the workflow, but their UX and lifecycle differ. See [OpenCode CLI service](https://opencode.ai/docs/cli/) and [TUI tabs](https://opencode.ai/docs/cli/tui/).
- Pi RPC/SDK support does not imply compatibility with OpenCode's HTTP server API or `opencode acp`. If an editor or tool depends on those contracts, assess a separate adapter. See [OpenCode ACP](https://opencode.ai/docs/cli/acp/).
- OpenCode offers managed policy configuration, including provider/integration restrictions and system configuration precedence. A normal Pi settings file is not an equivalent managed control plane. See [OpenCode policies](https://opencode.ai/docs/policies/) and [configuration](https://opencode.ai/docs/config/).
- Provider count is not provider parity. Verify the team's precise gateway, proxy, authentication method, model IDs, streaming, tools, and usage reporting. A package cannot provide a provider subscription or OpenCode Console billing relationship.
- The shell remains able to run ordinary development tools, but native convenience tools can change the model's behavior and context. Neither fewer tools nor more extensions establishes superior coding quality or lower total cost without measurement.

**Effort estimates and pilot**

These are engineering estimates, not observed implementation times. For someone comfortable with Node CLI tooling, assume roughly half a day to one day for a simple pinned install/skip prototype; three to five working days for a useful single-platform team candidate with configuration, diagnostics, and representative workflow checks; and one to two or more weeks for a polished release spanning multiple operating systems, migration, rollback, and permission/child integration. Existing company packaging can shorten this; restricted networks and Windows support can increase it. Full API, UI, policy, and lifecycle equivalence is an open-ended product project.

Before choosing, run a one-to-two-week crossover pilot on representative repositories. Each tool should use the same model/provider, task, starting commit, budget, project instructions, and required integrations. Compare default OpenCode to the proposed team Pi profile; record any intentional differences.

| Acceptance case | Evidence to collect |
|---|---|
| Fresh developer installation | Time to first useful task; manual fixes; credentials/binary setup |
| Planning | Project source unchanged until implementation is accepted; clear mode display |
| Background process | Start, inspect output, cancel, completion notification, cleanup |
| Foreground and background subagents | Working expected tools; explicit child restrictions; correct approval destination |
| MCP | Required transport, login, reconnect, tool visibility, and child access |
| Undo/redo | Existing dirty files, create/delete/rename, shell changes, manual edits between prompts, restart, exclusions |
| Parallel work | No unintended shared-worktree conflicts; recoverable cancellation and failures |
| Normal implementation | Correct diff, passing repository checks, review time, intervention count |
| Context pressure | Long-session continuation, retained constraints, cost after compaction |
| Upgrade and rerun | Preserved user config, deterministic resolution, actionable errors, working release rollback |

Measure completed correct work, wall time, reviewer effort, model cost including child runs/cache/compaction, setup failures, and maintainer time. Do not score a feature as covered merely because its tool name appears.

As a secondary option, [Oh My Pi](https://github.com/can1357/oh-my-pi) is a Pi-derived coding agent that already integrates many of these features. It is a separate fork and should be evaluated separately if the real requirement is Pi-style extensibility with an integrated coding experience. It is not proof that a small installer recreates the same product.

The decision I would propose at work is a small, maintained Pi pilot with an explicit owner and acceptance criteria. If the team values its customization and its measured results justify maintenance, adopt the curated release. If nobody will own integration and upgrades, OpenCode has the stronger practical case.
