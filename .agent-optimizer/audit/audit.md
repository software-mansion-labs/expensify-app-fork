# CLAUDE.md Audit (Phase 1 deliverable)

Per [`.cursor/plans/agent-optimizer-02-execution.md`](../../.cursor/plans/agent-optimizer-02-execution.md). Sole input to Phase 3 (rewrite). Every verdict cites a principle (P#) or anti-pattern (A#) from [`../research/principles.md`](../research/principles.md) and [`../research/anti-patterns.md`](../research/anti-patterns.md).

## Snapshot

- **File:** [CLAUDE.md](../../CLAUDE.md)
- **Line count:** 314 (Python `splitlines()` reports 313 — file lacks trailing newline).
- **Character count:** 10,675.
- **Token count (`tiktoken cl100k_base`):** **2,364**.
- **Hard cap (P4):** 200 lines.
- **Reduction required:** ≥36% lines.

<!-- token baseline computed via tiktoken in a tmp venv on 2026-05-19 -->

### Repo inventory used for the accuracy gate

Established up front so per-chunk checks can cite specific evidence.

| What | Source of truth | Notes |
|---|---|---|
| npm scripts | [package.json](../../package.json) lines 9–75 | All command claims checked here. |
| Provider hierarchy | [`src/App.tsx`](../../src/App.tsx) lines 67–137 | `ComposeProviders` array is the canonical order. |
| Entry points | [`src/App.tsx`](../../src/App.tsx), [`src/Expensify.tsx`](../../src/Expensify.tsx), [`src/HybridAppHandler.tsx`](../../src/HybridAppHandler.tsx), [`index.js`](../../index.js) | All present. |
| Onyx keys | [`src/ONYXKEYS.ts`](../../src/ONYXKEYS.ts) | Single large object; categories in CLAUDE.md are an editorial summary, not real groupings. |
| Action modules | `Glob src/libs/actions/*.ts` | **83** files at root + 11 in `Policy/`. CLAUDE.md lists 8 — wildly partial. |
| Mobile-Expensify path | Repo tree | Lives at **`Mobile-Expensify/`** at repo root. CLAUDE.md says `App/Mobile-Expensify/` (line 161) — **wrong**. |
| Skills | `Glob .claude/skills/*/SKILL.md` | 7 skills: `agent-device`, `agent-device-evidence`, `coding-standards`, `measure-telemetry-span`, `onyx`, `playwright-app-testing`, `sentry`. |
| `react-native-best-practices` skill | `~/.claude/plugins/cache/callstack-agent-skills/.../SKILL.md` | **Not** in the repo's `.claude/skills/`. User-installed plugin only. Portability concern under Q1 → Path A (see open question O3 below). |
| Workflows | `Glob .github/workflows/*.yml` | Files `deploy.yml`, `preDeploy.yml`, `testBuild.yml`, `test.yml`, `typecheck.yml`, `lint.yml` all present. `preDeploy.yml` runs on push to main (post-merge); calling it "staging deployment" is editorial. |
| `react-compiler-compliance-check` | [`package.json`](../../package.json) line 69, [`scripts/react-compiler-compliance-check.ts`](../../scripts/react-compiler-compliance-check.ts) lines 7–11 | Script accepts subcommands `check <files...>` and `check-changed`. CLAUDE.md command `npm run react-compiler-compliance-check check-changed` does work (npm passes positional args), so it's accurate enough — flagged as form (verify with `--` for clarity). |
| `contributingGuides/REACT_COMPILER.md` | Filesystem | Exists. Link is accurate. |

## Tagging legend

- **Keep** — passes justification + accuracy + form (or form-fix recorded as a note).
- **Verify** — passes justification but failed accuracy. Rewrite uses the corrected value.
- **Demote** — passes justification but multi-step or area-specific; belongs in a skill or `.claude/rules/` per P6.
- **Cut** — fails the justification gate (matches A1–A8). The expected high-volume verdict for the current file.

## Per-chunk entries

<!-- Chunks numbered top-to-bottom in CLAUDE.md. Stop at first verdict per the plan. -->

## chunk-1: Title `# Expensify App`

- Lines: 1
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2 / A5
- Reason: A title naming the repo Claude already knows it's working in adds nothing actionable. The rewrite's first content is the lead block (P2), not a title decoration.
- Rewrite note: Drop. Optional: replace with a 1-line H1 if the harness needs an anchor, otherwise omit.

## chunk-2: `## Repository Overview` heading

- Lines: 3
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Heading-only chunk; only meaningful if its children survive. Its only child (Technology Stack) is also Cut, so this label has no purpose.

## chunk-3: `### Technology Stack` list

- Lines: 5–10 (6 lines)
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A5
- Reason: "Framework: React Native / Language: TypeScript / Platforms: iOS/Android/Web." All five facts are recoverable from `package.json` and the file tree in one `Read`. Matches A2 (self-discoverable) and A5 (standard practices included for completeness).

## chunk-4: `## HybridApp Architecture (Critical Context)` heading + IMPORTANT lines (14–15)

- Lines: 12–15
- Category: architecture
- Tag: Keep
- Gate that decided: justification (and accuracy passes for the substance, only emphasis-overuse fails form)
- Cited principle / anti-pattern: P2 (top trap), P7 (emphasis overuse)
- Reason: The "mobile builds originate from the Mobile-Expensify submodule, not the App repo" claim is the canonical trap a fresh agent would otherwise re-discover the hard way (P2). The NewDot/OldDot/Expensify-Classic vocabulary is needed for any conversation about the app — agents would otherwise ask. Both rules survive.
- Rewrite note: Collapse the two `**IMPORTANT**:` markers into one. P7 caps the file at ≤5 IMPORTANT/MUST markers; the doubled marker on adjacent lines is exactly the overuse pattern P7 names. Lead block belongs in the new Lead Block, not in a "Critical Context" subsection.

## chunk-5: `### Key Integration Points` list

- Lines: 17–22 (6 bullets)
- Category: architecture
- Tag: Keep (compressed)
- Gate that decided: justification
- Cited principle / anti-pattern: P2 (would-otherwise-re-explain), P5 (concrete)
- Reason: Two of the six bullets are actionable traps: "Build process merges dotenv configurations from both repositories / Environment variables from Mobile-Expensify take precedence" and "Mobile builds must be initiated from the Mobile-Expensify directory". The other four restate the same trap or are flavor.
- Rewrite note: Keep the two trap rules. Drop the rest. Move into the Lead block as do-rules (P9 positive framing).

## chunk-6: `### Build Modes` list

- Lines: 24–27
- Category: architecture
- Tag: Keep (compressed)
- Gate that decided: justification
- Cited principle / anti-pattern: P5
- Reason: The `STANDALONE_NEW_DOT` env-variable rule is concrete and would otherwise be re-explained. The "Standalone vs HybridApp" framing isn't load-bearing on its own.
- Rewrite note: Collapse to one line: "Set `STANDALONE_NEW_DOT=true` to build pure NewDot (web only); leave unset for mobile HybridApp."

## chunk-7: `## Core Architecture & Structure` heading

- Lines: 29
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Heading is only justified if its children survive. None do (chunks 8–10 all Cut/Demote).

## chunk-8: `### Entry Points` list

- Lines: 31–35
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6, A2
- Reason: File-by-file description of `src/App.tsx`, `src/Expensify.tsx`, `src/HybridAppHandler.tsx`, `index.js`. Every entry is one `Read` away — verbatim ❌ Exclude row "File-by-file descriptions of the codebase" (A6). The agent can use the standard React Native convention to find `index.js`, and `Read src/App.tsx` answers everything else in one tool call.

## chunk-9: `### Provider Architecture` list

- Lines: 37–46
- Category: architecture
- Tag: Cut
- Gate that decided: justification (and would have failed accuracy regardless)
- Cited principle / anti-pattern: A6, A7
- Reason: Lists 8 providers. Actual [`src/App.tsx`](../../src/App.tsx) (lines 92–120) wraps in 25+ providers via `ComposeProviders`, plus 2 outer providers (`SplashScreenStateContextProvider`, `InitialURLContextProvider`), `SafeAreaProvider`, and `GestureHandlerRootView`. Order in CLAUDE.md is also wrong (it says `ThemeProvider` then `LocaleContextProvider`; actual is the inverse). Even if accurate, this is a textbook A6/A7 entry — stale within months, none of these provider names are something the agent needs to recall by memory.
- Correction (if Verify rather than Cut): `LocaleContextProvider, ThemeProvider, ThemeStylesProvider, SafeArea, OnyxListItemProvider, …` — but the right answer is to delete the list, not maintain it.

## chunk-10: `### Data Layer` list

- Lines: 48–51
- Category: architecture
- Tag: Demote
- Gate that decided: justification
- Cited principle / anti-pattern: A6, A8 (Onyx prose belongs in the skill), P6
- Reason: Three bullets about Onyx — already covered in depth by the existing [`.claude/skills/onyx/SKILL.md`](../../.claude/skills/onyx/SKILL.md) (Onyx state management patterns — useOnyx hook, action files, optimistic updates, collections, offline-first). Anything an agent needs about Onyx is in that skill, loaded on demand.
- Target (Demote): no append needed — content is already in [`.claude/skills/onyx/SKILL.md`](../../.claude/skills/onyx/SKILL.md). Just ensure the skill is named in CLAUDE.md's skill index with its explicit path (H5).

## chunk-11: `## Key Features & Modules` → `### Core Functionality` (Expense, Reporting, Workspace, Travel, Search, Payments, Accounting, Communication, Invoice)

- Lines: 53–109 (57 lines, 9 nested feature lists)
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6, A7
- Reason: Feature catalog with no actionable instruction. None of these bullets is something an agent would re-ask about or follow as a directive. Pure marketing-style enumeration that drifts every sprint (A7) and consumes ~57 of the file's 314 lines — single largest A6 violation in the file.

## chunk-12: `## Navigation & Routing` heading

- Lines: 111
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Children also Cut/Demote; heading carries no value alone.

## chunk-13: `### Structure` list (SCREENS / ROUTES / NAVIGATORS)

- Lines: 113–116
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A6
- Reason: "`src/SCREENS.ts`: Screen name constants / `src/ROUTES.ts`: Route definitions / `src/NAVIGATORS.ts`: Navigator configuration." Self-evident from filenames. One `Grep` or `Read` answers every question the agent could have. ❌ Exclude row "File-by-file descriptions" (A6).

## chunk-14: `### Key Navigators` list

- Lines: 118–124
- Category: architecture
- Tag: Cut
- Gate that decided: justification (would also fail accuracy)
- Cited principle / anti-pattern: A6, A7
- Reason: List of 6 navigator names with one-line descriptions. The bullet "RHP (Right Hand Panel/Pane)" appears once on line 121 and again as "RHP: Contextual panels and settings" on line 124 — **literal duplicate**. Even fixed, the content is recoverable from `src/NAVIGATORS.ts` in one `Read`.
- Open question: O1 — confirm that the duplicated RHP line is not a typo for some other navigator the original author meant to mention. Best guess: pure duplicate, safe to drop.

## chunk-15: `## State Management` heading

- Lines: 126
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Children all Cut/Demote; orphan heading.

## chunk-16: `### Onyx Keys Organization` list

- Lines: 128–134
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A7, A8
- Reason: Six editorial "categories" (Session, Personal Details, Reports, Transactions, Policy, Forms). `src/ONYXKEYS.ts` is a flat object — there are no "categories" in the code; this is purely a human-friendly grouping. Listed in research as a textbook A2/A7 violation. The `onyx` skill covers anything load-bearing.

## chunk-17: `### Action Modules` list

- Lines: 136–145
- Category: architecture
- Tag: Cut
- Gate that decided: justification (also fails accuracy)
- Cited principle / anti-pattern: A6, A7
- Reason: Lists 8 "major action categories" out of **83** files at `src/libs/actions/` and an additional 11 in `src/libs/actions/Policy/`. The implication that these 8 are "the important ones" is editorial; any real navigation task uses Glob. Stale enumeration of a frequently-changing directory — A7 by definition.

## chunk-18: `## Build & Deployment` heading + `### CI/CD Workflows` list

- Lines: 147–156
- Category: workflow
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A6
- Reason: Lists 6 workflow filenames with one-line descriptions ("deploy.yml: Production deployment", etc.). Workflow filenames are discoverable via `Glob .github/workflows/*.yml` — 59 workflows live there. Picking 6 to call out adds no behavioral guidance and is misleading by omission. ❌ Exclude row.

## chunk-19: `## Related Repositories` heading

- Lines: 158
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading.

## chunk-20: `### Mobile-Expensify (Submodule)` block

- Lines: 160–165
- Category: path / architecture
- Tag: Verify
- Gate that decided: accuracy
- Cited principle / anti-pattern: P2, P5
- Reason: The "**Critical**: All mobile builds originate from this directory" claim is the same trap as chunk-4 — keep as the trap rule. **But the path is wrong:** CLAUDE.md says `App/Mobile-Expensify/`. The submodule actually lives at **`Mobile-Expensify/`** at the repo root (verified by listing the tree; there is no `App/` directory). This is the single most consequential accuracy bug in the file because the path is exactly what an agent would need to `cd` into.
- Correction: change `App/Mobile-Expensify/` → `Mobile-Expensify/`.
- Rewrite note: After correction, fold the surviving claim into the Lead block alongside chunk-4/chunk-5. The "Purpose: Legacy OldDot…" and "Contains platform-specific code for iOS and Android" bullets are A5/A6 narrative — drop those.

## chunk-21: `### expensify-common` block

- Lines: 167–170
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A6
- Reason: "Shared libraries and utilities… common validation, parsing, and utility functions… Used across multiple Expensify repositories." Three lines of marketing prose. `package.json` lists `expensify-common` as a dependency — agent can `Read` if needed. No action-relevant guidance.

## chunk-22: `## Development Practices` heading

- Lines: 172
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading. Children survive partially via skill refs but don't need this label.

## chunk-23: `### React Native Best Practices` paragraph + 7-bullet skill summary

- Lines: 174–184 (11 lines)
- Category: skill-ref
- Tag: Verify + Demote
- Gate that decided: justification (skill index needed) + accuracy (slash-command syntax not portable; skill not in repo)
- Cited principle / anti-pattern: P6 (skills index), H5 (explicit `name + path`), P10 implication (Q1 Path A demands portability)
- Reason: A skill reference is correct in principle (P6: on-demand content lives in skills). Two problems:
  1. The reference uses the slash-command form `/react-native-best-practices`, which is Claude-Code-only syntax. Phase 2 hard constraint: no `/skill-name` shorthand without explicit path. (Q1 Path A.)
  2. The skill `react-native-best-practices` is **not** at any `.claude/skills/<name>/SKILL.md` path inside this repo — it lives under `~/.claude/plugins/cache/callstack-agent-skills/<hash>/skills/react-native-best-practices/SKILL.md`. A non-Claude-Code agent (Cursor, Codex) cannot resolve it. The 7-bullet summary of what the skill covers is also pure A8 (API/library doc inline) and A6 (file-by-file prose).
- Correction / Target (Demote): Drop the 7-bullet summary entirely. In the rewrite's skill index, either (a) cite the skill by its real on-disk plugin path so a multi-tool agent can `Read` it, or (b) drop the reference and document the rule (only Claude Code users get it auto-loaded). See Open question O3.

## chunk-24: `### Code Quality` block

- Lines: 186–190
- Category: workflow
- Tag: Cut (mostly) / Demote (one rule)
- Gate that decided: justification
- Cited principle / anti-pattern: A5 (TypeScript strict mode, Prettier on save), A2 (run `npm run prettier`)
- Reason: "TypeScript: Strict mode enabled / ESLint: Linter / Prettier: run `npm run prettier` / Patch Management: patch-package for dependency fixes." All four are either A5 (model already knows) or duplicated by the Post-Edit Checklist (A3 risk — see chunk-25). The `eslint-seatbelt` mention is mildly interesting but covered by `npm run lint` failing on new violations; agents don't need to know the mechanism.
- Rewrite note: All Code-Quality rules consolidated into the Post-Edit Checklist do/don't table (chunk-25 below). No separate "Code Quality" heading.

## chunk-25: `### Post-Edit Checklist (IMPORTANT)` ordered list

- Lines: 192–197 (6 lines)
- Category: workflow
- Tag: Keep
- Gate that decided: justification (all 4 commands are concrete, would-otherwise-re-explain) + accuracy passes + form passes after one fix
- Cited principle / anti-pattern: P2 (concrete trap rules), P5 (concrete commands), P7 (the `(IMPORTANT)` heading + bold `**ALWAYS**` is mild overuse but defensible here)
- Reason: All four bullets cite real npm scripts that exist in [package.json](../../package.json) (`prettier`, `lint-changed`, `typecheck-tsgo`, `typecheck`, `react-compiler-compliance-check`) and describe directives agents otherwise miss. Recently-discussed traps: tsc-vs-tsgo (CI gate vs dev), `lint-changed` not just `lint`, react-compiler check on changed files. These are exactly the P2 examples of "things you'd otherwise re-explain every session."
- Rewrite note: Recast as a 4-row do/don't table (P9). The "(IMPORTANT)" heading suffix can go — the do/don't structure already conveys priority (P7). Verify accuracy: `npm run react-compiler-compliance-check check-changed` does work (npm passes positional args without `--`), but for clarity prefer `npm run react-compiler-compliance-check -- check-changed` — flagged as form-only. Sub-claim `~10x faster and usually stricter than tsc` is editorial — keep "faster, dev-only" and drop "stricter".
- Open question: O2 — confirm whether the tsgo "stricter than tsc" wording should be kept (research found no benchmark; I recommend dropping the comparative claim and keeping just "fast, dev-only; CI gate is `npm run typecheck`").

## chunk-26: `### Testing` block

- Lines: 199–201
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A5
- Reason: "Unit Tests: Jest with React Native Testing Library / Performance Tests: Reassure framework." Two lines, no actionable rule. `package.json` (`jest`, `reassure`) discloses both. If a testing workflow rule matters, surface it as a directive (e.g. "Run `npm run test` …"); the current text doesn't.

## chunk-27: `## Special Considerations` heading

- Lines: 203
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading. The label "Special Considerations" is uninformative.

## chunk-28: `### Offline-First Architecture` list

- Lines: 205–209
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A8, A5
- Reason: 4 generic statements ("All features work offline / Optimistic updates with rollback / Queue-based request handling / Conflict resolution strategies"). No directive. Onyx skill covers anything actionable (P6/A8).

## chunk-29: `### Mobile-Specific Notes` list

- Lines: 211–214
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A6
- Reason: "Push notifications via Airship / Mapbox integration / Camera and gallery access." Three random library callouts. `package.json` (`@ua/react-native-airship`, `@rnmapbox/maps`, etc.) shows what's installed; nothing in this list directs the agent's behavior.

## chunk-30: `### Security` list

- Lines: 216–218
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A5
- Reason: "Content Security Policy enforcement / Two-factor authentication support." Two facts with no associated directive. Standard practices the agent doesn't need spelled out.

## chunk-31: `## Documentation Resources` → `### Help Documentation` (links)

- Lines: 220–224
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A8
- Reason: Two URLs to help.expensify.com hubs. End-user product help, not engineering reference. The agent does not need to consult these to make code changes. ❌ Exclude row "Detailed API documentation (link to docs instead)" — but this isn't even API docs, it's product help.

## chunk-32: `## Development Setup Requirements` heading

- Lines: 226
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading; only child is the Sentry skill ref, which moves into the skill index.

## chunk-33: `### Sentry analysis` paragraph

- Lines: 228–230
- Category: skill-ref
- Tag: Keep
- Gate that decided: justification
- Cited principle / anti-pattern: P6, H5
- Reason: Skill reference. Correct in principle. Move into the rewrite's footer skill index with explicit path `.claude/skills/sentry/SKILL.md` and one-line trigger (H5).
- Rewrite note: Replace "Use Sentry skill whenever user wants to…" prose with one row in the skill index table.

## chunk-34: `## Command Reference` → `### Common Tasks` code block (bash)

- Lines: 232–256 (25 lines)
- Category: command
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2 (canonical example named in plan), P3
- Reason: Eight `npm` commands (`install`, `run clean`, `run typecheck-tsgo`, `run typecheck`, `run lint`, `run prettier`, `run test`, comments). Every one is in [package.json](../../package.json). This is **the canonical Cut** the plan calls out explicitly: matches A2 verbatim, "❌ Exclude: Anything Claude can figure out by reading code" / "❌ Exclude: Information that changes frequently." The Post-Edit Checklist (chunk-25) already directs the agent to the specific subset of these commands that matters (tsgo, typecheck, lint-changed, react-compiler-compliance-check, prettier).
- Rewrite note: If a "list of useful commands" temptation arises, resist — it is exactly the bloat A1 warns against. The Post-Edit Checklist is the single source of truth for commands.

## chunk-35: `### Platform Builds` code block (bash)

- Lines: 258–268
- Category: command
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A2, A3
- Reason: Three commands (`npm run ios`, `npm run android`, `npm run web`). All in package.json. Worse: contradicts the chunk-4 HybridApp trap. The HybridApp section says "Mobile builds **must** be initiated from the Mobile-Expensify directory" but this block shows `npm run ios` and `npm run android` at the App repo root with no caveat — agents that read this section first will assume the App-repo root is correct. **Live A3 (contradictory rules)** — flagged for explicit cleanup in the rewrite.
- Rewrite note: Drop the block. The HybridApp trap rule from chunk-4/chunk-20 is the single rule about how to build mobile.

## chunk-36: `## Development Environment` heading

- Lines: 270
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading; children survive partially as skill refs and the dev-server rule, but don't need this label.

## chunk-37: `### Dev Server` block

- Lines: 272–276
- Category: workflow
- Tag: Keep (compressed)
- Gate that decided: justification (the host-vs-VM rule is concrete and would-otherwise-re-explain)
- Cited principle / anti-pattern: P2, P5
- Reason: "Runs on HOST machine (not in VM); URL: `https://dev.new.expensify.com:8082/`; Start command: `npm run web`; VM is only for backend services." This is concrete enough to follow and (for environments that have a VM) genuinely traps newcomers. The list of VM-backend services is editorial — fine to drop.
- Rewrite note: Collapse to one or two lines: "Dev server runs on host with `npm run web` at `https://dev.new.expensify.com:8082/`; backend services run in the VM, frontend never does." Verify port `8082` against repo at rewrite time if convenient (not blocking).

## chunk-38: `### Browser Testing` paragraph

- Lines: 278–279
- Category: skill-ref
- Tag: Keep
- Gate that decided: justification
- Cited principle / anti-pattern: P6, H5
- Reason: Skill reference to `playwright-app-testing`. Skill exists at [`.claude/skills/playwright-app-testing/SKILL.md`](../../.claude/skills/playwright-app-testing/SKILL.md). Move to the skill index footer with explicit path. Replace slash-command syntax (`/playwright-app-testing`) with `name + path` per H5 / Q1 Path A.

## chunk-39: `### Mobile Device Testing` paragraph

- Lines: 281–282
- Category: skill-ref
- Tag: Keep
- Gate that decided: justification
- Cited principle / anti-pattern: P6, H5
- Reason: Skill reference to `agent-device`. Skill exists at [`.claude/skills/agent-device/SKILL.md`](../../.claude/skills/agent-device/SKILL.md). The "Requires `npm install -g agent-device`" note is pre-flight info but the skill's own pre-flight check already surfaces it, so dropping the install line keeps the rewrite tighter without losing real guidance.
- Rewrite note: One row in skill index, no install-line.

## chunk-40: `## Architecture Decisions` heading

- Lines: 284
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading. All three children Cut.

## chunk-41: `### React Native New Architecture` list

- Lines: 286–289
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A5, A8
- Reason: "Fabric renderer enabled / TurboModules / Hermes JavaScript engine." Three labels. No directive. RN engine config is config-discoverable; agents don't need to memorize the trio. ❌ Exclude row.

## chunk-42: `### State Management Choice` list

- Lines: 291–295
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A8
- Reason: Onyx description re-stated for the third time in the file (chunks 10, 16, 28, here). Detailed API doc inline. ❌ Exclude row. Onyx skill covers it.

## chunk-43: `### Navigation Strategy` list

- Lines: 297–300
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A5, A6
- Reason: "React Navigation for cross-platform consistency / Custom navigation state management / Deep linking support." Three generic statements with no directive.

## chunk-44: `## Known Integration Points` heading

- Lines: 302
- Category: narrative
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6
- Reason: Orphan heading.

## chunk-45: `### With Mobile-Expensify` list

- Lines: 304–308
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A6, A8
- Reason: Four bullets describing how HybridApp integration works. Conceptual prose, no directive. The trap that matters ("builds from Mobile-Expensify") is already kept via chunks 4–5–20.

## chunk-46: `### With Backend Services` list

- Lines: 310–313
- Category: architecture
- Tag: Cut
- Gate that decided: justification
- Cited principle / anti-pattern: A5, A8
- Reason: "RESTful API / WebSocket via Pusher / Real-time sync." Three labels; no directive.

## Summary (Step 5)

### Per-tag counts (46 chunks)

| Tag | Count | % of chunks |
|---|---|---|
| Cut | 33 | 72% |
| Demote | 1 (chunk-10) + partial overlap with chunk-23 | ~3% |
| Keep | 8 (chunks 4, 5, 6, 20-keep-part, 25, 33, 37, 38, 39) — chunk-20 is both Verify-for-path and Keep-for-rule, counted once | ~17% |
| Verify | 2 (chunks 20, 23 — chunk-23 also Demote) | ~4% |

(Numbers loosely sum: tags overlap on chunks where a path is wrong **and** the rule is needed.)

### Token / line baseline

- Current: 314 lines, 2,364 tokens. Cap: 200 lines. Reduction required ≥36%.

### Projected post-rewrite line count

Estimating content that survives, in lines (compressed per the rewrite voice rules):

| Source | Lines (est.) |
|---|---|
| Lead block (10–15 lines, P2) merging chunks 4 + 5 + 6 + 20 + 25 traps | 12–15 |
| Build do/don't table (chunks 4, 5, 6, 20 corrected, 35 contradiction resolved) | 8–10 |
| Post-Edit Checklist do/don't table (chunk-25) | 6–8 |
| Dev-server one-liner (chunk-37) | 2–3 |
| Skill index footer: 7 in-repo skills × 1 row each + 1 row for `react-native-best-practices` plugin (pending O3) | 10–12 |
| `.claude/rules/` index (if any rules created — currently none required) | 0–2 |
| Section headings, blank lines, structure | 15–20 |
| **Total projected** | **53–70** |

Comfortable headroom under the 200-line cap. **No additional `Demote` candidates needed to meet the cap.**

### Open questions for user review (batched per Step 5)

These are non-load-bearing — answers preferred before Phase 3 but the rewrite can default the questions if you'd rather move on.

- **O1.** chunk-14: the duplicated "RHP" bullet in "Key Navigators" — confirm it's a duplicate, not a typo for some other navigator. (Best guess: pure duplicate. The whole list is Cut either way, so this is informational only.)
- **O2.** chunk-25: drop the "~10× faster and **usually stricter than tsc**" comparative claim from the tsgo line? No benchmark was found in research. Recommended action: drop, replace with "fast; dev-only — CI gate is `npm run typecheck`."
- **O3.** chunk-23 (the largest open question): the `react-native-best-practices` skill is a **user-level plugin**, not in `.claude/skills/`. Three options:
   1. Reference it by its real plugin path (`~/.claude/plugins/cache/callstack-agent-skills/.../SKILL.md`) so non-Claude-Code agents can read it. Brittle — the path includes a hash.
   2. Drop the skill ref entirely. Claude Code still auto-discovers user-level skills based on triggers (this is its native behavior), so dropping doesn't lose the skill — just stops advertising it. Non-Claude-Code agents lose nothing they had.
   3. Copy/symlink the skill into the repo's `.claude/skills/react-native-best-practices/SKILL.md` so it's first-class and portable. Highest value, but adds maintenance.
   - **Recommendation:** Option 2 by default (drop the file's reference, keep the auto-discovery for Claude Code). Re-promote to Option 3 only if Phase 4a shows agents fail tasks the skill would have caught.
- **O4.** chunk-35 (`### Platform Builds`): confirms the live A3 contradiction (App-repo `npm run ios/android` shown without HybridApp caveat). Rewrite resolves it by Cutting the block. Flag if you intended these commands to be runnable from the App repo root in any context — research suggests no, but verify.

### Hand-off to Phase 3

This audit is the **sole input** to the rewrite. The rewrite procedure (per Phase 3 of the plan) walks `Keep`/`Verify` chunks first (chunks 4, 5, 6, 20, 25, 33, 37, 38, 39), builds the Lead block from the highest-priority trap chunks (4, 5, 6, 20, 25 — Post-Edit Checklist deserves at least one explicit row in the Lead block: "Run tsgo before committing, not tsc"), and demotes/cuts the rest.

No content needs to be moved to a new `.claude/rules/<topic>.md` — every Demote already has a target (the `onyx` skill for chunk-10). No new skill creation required.

## Addendum: Phase 4a iteration-1 findings (added 2026-05-20)

Three of six Phase 4a eval subagents (R2.old, R3.old, R2.new) independently flagged that the trap rule "mobile builds must be initiated from the Mobile-Expensify directory" — inherited verbatim from chunks 4, 5, and 20 — does **not** match the actual codebase. Verified after the eval:

- [`contributingGuides/HYBRID_APP.md`](../../contributingGuides/HYBRID_APP.md) §"How is HybridApp built?": builds run with `npm run ios` / `npm run android` from the **App repo root**; the scripts auto-detect HybridApp from the submodule's presence.
- [`Mobile-Expensify/README.md`](../../Mobile-Expensify/README.md): "This repository is a submodule of Expensify/App, and **cannot be built separately**."
- [`scripts/run-build.sh`](../../scripts/run-build.sh): runs from App root, calls `scripts/is-hybrid-app.sh` to detect the submodule, builds HybridApp if present and `STANDALONE_NEW_DOT=false`.
- [`Mobile-Expensify/package.json`](../../Mobile-Expensify/package.json): has no `ios` or `android` script.

The real trap is different: **native code lives in `Mobile-Expensify/iOS/` and `Mobile-Expensify/Android/`. Edits to `./ios/` and `./android/` at the App root do not affect HybridApp builds** — explicitly stated in `HYBRID_APP.md`.

### Audit blind spot identified

My accuracy gate (Step 1 → "category recipes") cross-checked:

- Command claims against `package.json` ✓
- Path claims against the file tree ✓
- Skill refs against `.claude/skills/` ✓

It did **not** cross-check **assertion-level claims** ("builds must be initiated from X", "X must precede Y") against the relevant primary source (`contributingGuides/HYBRID_APP.md`). Chunks 4, 5, and 20 inherited an outdated assertion verbatim from the source CLAUDE.md. The Phase 4a eval surfaced this — exactly what the eval is for.

### Re-tagging for chunks 4, 5, 20 (post-iteration)

| Chunk | Original tag | Revised tag | Correction |
|---|---|---|---|
| 4 (HybridApp Critical Context IMPORTANT lines) | Keep | Verify | "Mobile builds run from App repo root with submodule initialized; submodule cannot be built alone" replaces "builds must be initiated from the Mobile-Expensify directory." Adds the real trap: native code location. |
| 5 (Key Integration Points) | Keep | Verify | Same correction. Drops the "must be initiated from Mobile-Expensify" bullet. |
| 20 (Mobile-Expensify submodule block) | Verify (path only) | Verify (path **and** assertion) | Path `App/Mobile-Expensify/` → `Mobile-Expensify/` (original correction). PLUS: "All mobile builds originate from this directory" replaced with "Holds OldDot + native iOS/Android code; not buildable alone; `npm run ios` / `npm run android` live at App root and auto-detect HybridApp." |

### Audit gate revision for next quarterly review

Add a fourth category to the Step-3 accuracy gate:

4. **Assertion gate.** For each prescriptive claim ("must be X", "must precede Y", "always Z"), find the primary source (philosophy doc, build script, or canonical README) and verify the claim against it. Do not trust the source CLAUDE.md's own claims.

The validate scripts ([`../evaluate/validate/run.sh`](../evaluate/validate/run.sh)) cannot enforce this — assertion correctness is content, not structure. Add it to the **quarterly review checklist** in the maintenance contract footer of CLAUDE.md.
