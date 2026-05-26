# Comparison Report — 2026-05-21

**Task success:** improved 1/2 → 2/2  
**Avg cost/task:** $0.0444 → $0.0390 (-12% 🟢)  
**Avg output tokens:** 99 → 100 (+2% 🔴)

## Lookup: mobile build origin

**Prompt:** I cloned the Expensify App repo for the first time. What directory do I run mobile builds from, and why?

**Expected:**
- Names the **App repo root** as the build directory. *(correctness)*
- Mentions `git submodule update --init` before building. *(correctness)*
- No file exploration — answer comes directly from CLAUDE.md. *(tool_calls: 0)*

| | Baseline (HEAD) | Candidate | Δ |
|---|---|---|---|
| Correctness | ✗ fail | ✓ pass | improved 🟢 |
| Tool calls | 0 | 0 | — ⚪ |
| Turns | 1 | 1 | — ⚪ |
| Input tokens | 23707 | 22208 | -6% 🟢 |
| Output tokens | 127 | 140 | +10% 🔴 |
| Duration | 6.5s | 5.4s | -17% 🟢 |
| Cost | $0.0450 | $0.0396 | -12% 🟢 |

**Grader notes**
- Baseline: Agent incorrectly states builds run from `App/Mobile-Expensify/` (a double-nested path) and says to cd into the submodule, when the correct answer is to build from the repo root.
- Candidate: Agent correctly identified the App repo root as the build directory, mentioned `git submodule update --init`, and explicitly warned against cd-ing into `Mobile-Expensify/`.

## Trap: typecheck-tsgo vs typecheck

**Prompt:** I just modified `src/libs/actions/Report.ts` to change a function signature. Which command should I run to check for type errors, and why?

**Expected:**
- Runs `npm run typecheck-tsgo`, not `npm run typecheck` or bare `tsc`. *(correctness)*
- Does not ask which typecheck command to use. *(correctness)*

| | Baseline (HEAD) | Candidate | Δ |
|---|---|---|---|
| Correctness | ✓ pass | ✓ pass | — ⚪ |
| Tool calls | 0 | 0 | — ⚪ |
| Turns | 1 | 1 | — ⚪ |
| Input tokens | 23576 | 22215 | -6% 🟢 |
| Output tokens | 70 | 60 | -14% 🟢 |
| Duration | 3.7s | 3.0s | -19% 🟢 |
| Cost | $0.0437 | $0.0384 | -12% 🟢 |

**Grader notes**
- Baseline: Agent correctly recommended `npm run typecheck-tsgo` without asking the user or reading package.json.
- Candidate: Agent correctly recommended `npm run typecheck-tsgo` without reading package.json or asking the user which command to use.
