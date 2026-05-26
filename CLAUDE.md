# Expensify App

<!-- last reviewed: 2026-05-20 -->
<!-- Provenance: every section cites a principle (P#) or anti-pattern (A#) from .agent-optimizer/research/research.md. Every rule traces to an audit chunk in .agent-optimizer/audit/audit.md. -->

## Top traps

<!-- P2: lead with what an agent would otherwise re-explain. Sourced from audit chunks 4, 5, 20-corrected, 25, 35-resolution; trap #1 and #3 wording corrected after Phase 4a eval evidence — see contributingGuides/HYBRID_APP.md and scripts/run-build.sh. -->

1. **IMPORTANT:** Mobile builds run with `npm run ios` / `npm run android` from the **App repo root** with the `Mobile-Expensify/` submodule initialized (`git submodule update --init`). The scripts auto-detect HybridApp from the submodule's presence. The submodule cannot be built alone.
2. App = NewDot. `Mobile-Expensify/` = OldDot / Expensify Classic. They combine into one HybridApp mobile binary via `@expensify/react-native-hybrid-app`.
3. Native mobile code lives in `Mobile-Expensify/iOS/` and `Mobile-Expensify/Android/`. Edits to `./ios/` or `./android/` at the App root do **not** affect HybridApp builds.
4. Local typechecking uses `npm run typecheck-tsgo` (fast, dev-only). The CI gate is `npm run typecheck` (tsc) — do not rely on it locally.
5. Onyx state writes go through action files in `src/libs/actions/`. Components never call `Onyx.merge` / `Onyx.set` / `Onyx.clear` / `API.write` directly.

## Build & mobile

<!-- P5 (concrete commands), P9 (positive single-sentence rules; tables avoided per user preference 2026-05-20). Audit chunks 4, 5, 6, 20-corrected, 35-resolution; corrected per Phase 4a eval evidence in contributingGuides/HYBRID_APP.md and scripts/run-build.sh. -->

- Run `npm run ios` / `npm run android` from the App repo root with the `Mobile-Expensify/` submodule initialized. Do not `cd Mobile-Expensify/` to build — the submodule cannot be built alone.
- Edit native code in `Mobile-Expensify/iOS/` and `Mobile-Expensify/Android/`. Edits to `./ios/` or `./android/` at the App root do not affect HybridApp builds.
- Set `STANDALONE_NEW_DOT=true` (or use the `-standalone` script variants) only for pure-NewDot builds. Production mobile is HybridApp; don't set it then.
- Run the dev server on the host with `npm run web` at `https://dev.new.expensify.com:8082/`. The VM is for backend services only.

## Post-edit checklist

<!-- P2 (would-otherwise-re-explain), P5 (concrete commands), P7 (one MUST marker allowed), P9 (positive single-sentence rules). Audit chunk-25. -->

Run after every code change, before committing. CI rejects PRs that skip any step.

- Format your diff with `npx prettier --write <changed files>`. CI rejects unformatted code.
- Lint your diff with `npm run lint-changed`. Skip the full `npm run lint` for quick feedback.
- Typecheck locally with `npm run typecheck-tsgo` after signature or type changes. The CI gate is `npm run typecheck` (tsc, slow) — use it only to match CI.
- After React component or hook edits, run `npm run react-compiler-compliance-check -- check-changed`. See `contributingGuides/REACT_COMPILER.md`.

## Onyx state

<!-- P6 (skill demote), A8 (no API doc inline), P9 (positive single-sentence rules). Audit chunks 10, 16, 17, 42. Full patterns live in .claude/skills/onyx/SKILL.md. -->

- Write Onyx state through an action file in `src/libs/actions/<Feature>.ts`. Never call `Onyx.merge` / `Onyx.set` / `Onyx.clear` / `API.write` from a component.
- Subscribe to data with the `useOnyx` hook. Don't reach for raw `Onyx.connect` in component code.
- Load `.claude/skills/onyx/SKILL.md` for action-file patterns, optimistic updates, and collections.

## Dev environment

<!-- P5 (concrete). Audit chunk-37. -->

- Dev server: `npm run web` on the host. URL `https://dev.new.expensify.com:8082/`.
- VM runs backend services (Auth, Bedrock, Integration-Server, Web-Expensify). Frontend never runs in the VM.

## Skills index

<!-- P6 (skills are the right home for on-demand content), H5 (name + explicit path so non-Claude-Code agents can Read). Every path verified to exist on 2026-05-20. -->

- **`coding-standards`** — `.claude/skills/coding-standards/SKILL.md`. Always loaded; React Native performance and consistency rules.
- **`onyx`** — `.claude/skills/onyx/SKILL.md`. Onyx connections, action files, optimistic updates, debugging state.
- **`sentry`** — `.claude/skills/sentry/SKILL.md`. Sentry issues, spans, crashes, performance metrics.
- **`playwright-app-testing`** — `.claude/skills/playwright-app-testing/SKILL.md`. Browser-testing the App after frontend changes.
- **`agent-device`** — `.claude/skills/agent-device/SKILL.md`. iOS/Android device testing, profiling, repro.
- **`agent-device-evidence`** — `.claude/skills/agent-device-evidence/SKILL.md`. Native MP4 evidence for PR or issue repro flows.
- **`measure-telemetry-span`** — `.claude/skills/measure-telemetry-span/SKILL.md`. Local Sentry span measurement with replay flow.

## Reference

<!-- P3: link to canonical docs instead of inlining (A8). -->

- HybridApp philosophy: [`contributingGuides/HYBRID_APP.md`](contributingGuides/HYBRID_APP.md), [`contributingGuides/philosophies/HYBRID-APP.md`](contributingGuides/philosophies/HYBRID-APP.md).
- React Compiler compliance: [`contributingGuides/REACT_COMPILER.md`](contributingGuides/REACT_COMPILER.md).
- Contributor guides (general): [`contributingGuides/CONTRIBUTING.md`](contributingGuides/CONTRIBUTING.md).
- Onyx package: [`react-native-onyx`](https://github.com/Expensify/react-native-onyx).

<!--
  Maintenance contract
  - Hard cap: 200 lines (P4). CI: .agent-optimizer/drift-check/check-claude-md.sh.
  - Every rule cites a P# or A# in .agent-optimizer/research/research.md (see also: .agent-optimizer/audit/audit.md).
  - Quarterly review process lives in .agent-optimizer/README.md. Task prompts and expected answers are intentionally not linked from here to keep them out of agent context.
  - To add a rule: prove it survives the justification gate ("would removing it cause an agent to make a real mistake?"). If not, the rule does not belong here.
-->
