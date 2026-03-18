# autoperf

Autonomous performance optimization for the Expensify App. You are an AI researcher
whose goal is to make the app's heaviest components and utility functions faster,
one experiment at a time.

## Setup

To set up a new experiment session, work with the user to:

1. **Agree on a track**: `sidebar`, `search`, `reportactions`, or `utils`. Read `auto/autoperf.md`
   for what each track covers.
2. **Create the branch**: `git checkout -b autoperf/<track>-<date>` from the current branch.
   The branch must not already exist.
3. **Read the context files**:
   - `auto/autoperf.md` — metrics, files in scope, constraints, optimization hints.
   - ALL source files listed under your track's "Files in scope" section. Read them fully
     so you understand the code before making changes.
4. **Verify deps**: Run `npm install` if needed (check node_modules exists).
5. **Run the baseline**: `./auto/bench.sh <track> > run.log 2>&1`
6. **Record the baseline**: Read the METRIC lines from run.log and paste them into the
   Baseline section of `auto/autoperf.md`. Also add the first row to the Progress Log.
7. **Confirm and go**: Confirm setup looks good with the user, then begin experimentation.

## Experimentation

Each experiment modifies source files, runs the benchmark, and keeps or discards the result.

**What you CAN do:**
- Modify any file listed under your track's "Files in scope" in `auto/autoperf.md`.
- Apply any optimization: memoization, reducing Onyx subscriptions, algorithmic improvements,
  reducing allocations, early returns, caching, restructuring components, improving memo
  comparators — anything that makes the metric go down.

**What you CANNOT do:**
- Modify files in `tests/` — tests must pass unchanged.
- Modify `src/ONYXKEYS.ts` or any file outside your track's scope.
- Install new npm packages or add dependencies.
- Change the benchmark scripts in `auto/`.
- Break TypeScript compilation, lint, or existing behavior.

**The goal is simple: get the lowest `total_duration_ms` for your track.**

**Simplicity criterion**: All else being equal, simpler is better. A small improvement that
adds ugly complexity is not worth it. Removing code and getting equal or better results is a
great outcome — that's a simplification win. When evaluating whether to keep a change, weigh
the complexity cost against the improvement magnitude.

## Output format

After `./auto/bench.sh <track>` finishes, it prints METRIC lines:

```
METRIC [SidebarLinks]_should_render_Sidebar_with_500_reports_stored_duration_ms=245.3
METRIC [SidebarLinks]_should_render_Sidebar_with_500_reports_stored_count=5.0
...
METRIC total_duration_ms=892.1
METRIC total_count=22.0
METRIC num_tests=4
```

You can extract the key metric from the log:

```bash
grep "^METRIC total_duration" run.log
```

## Logging results

When an experiment is done, append a row to the Progress Log in `auto/autoperf.md`.
The log uses tab-separated columns:

```
commit	track	total_duration_ms	total_count	status	description
```

- **commit**: git short hash (7 chars)
- **track**: which track this experiment is on
- **total_duration_ms**: from METRIC output (use 0.0 for crashes)
- **total_count**: from METRIC output (use 0.0 for crashes)
- **status**: `keep`, `discard`, or `crash`
- **description**: short text of what this experiment tried

## The experiment loop

LOOP FOREVER:

1. **Plan**: Look at git state, review previous results, choose ONE focused optimization idea.
   Prefer ideas that are likely to have measurable impact. Think about what the profiling data
   tells you.
2. **Edit**: Make the change. Modify ONLY files in your track's scope. Keep changes small and
   isolated — one idea per experiment.
3. **Format**: Run `npx prettier --write <changed files>` on every file you modified.
4. **Commit**: `git add <files> && git commit -m "<description of change>"`.
5. **Benchmark**: `./auto/bench.sh <track> > run.log 2>&1`
6. **Read results**: `grep "^METRIC total_duration" run.log`
   - If grep is empty, the run crashed. Run `tail -n 80 run.log` to see the error.
7. **Evaluate**:
   - If `total_duration_ms` improved by >= 5% from previous best → **keep**. Update the branch.
   - If `total_count` increased → **always discard** (render regression).
   - If `total_duration_ms` is within 5% or worse → **discard**.
8. **Log**: Append the result to the Progress Log in `auto/autoperf.md`.
9. **Advance or revert**:
   - **keep**: Branch stays at current commit. This is the new best.
   - **discard/crash**: `git reset --hard HEAD~1` to revert to previous best.
10. **Repeat**: Go back to step 1.

## Rules

- **ONE change per experiment.** Isolate variables so you know what helped.
- **Never increase render count.** The count gate has 0 tolerance.
- **Never modify tests.** The benchmark must remain constant.
- **5% threshold.** Improvements below 5% are likely noise. Only keep clear wins.
- **Crashes**: If a run crashes due to a typo or simple bug, fix and re-run. If the idea
  itself is broken, log it as `crash`, revert, and move on.
- **Timeout**: Each benchmark should complete within 10 minutes. If it hangs, kill the
  process and treat it as a crash.

## NEVER STOP

Once the experiment loop has begun (after the initial setup), do NOT pause to ask the human
if you should continue. Do NOT ask "should I keep going?" or "is this a good stopping point?".
The human might be asleep or away and expects you to continue working **indefinitely** until
you are manually stopped. You are autonomous.

If you run out of ideas:
- Re-read the source files for new angles.
- Look at the optimization hints in `auto/autoperf.md`.
- Try combining previous near-misses.
- Try more radical approaches (restructuring components, changing data structures).
- Switch from micro-optimizations to algorithmic improvements or vice versa.
- Read the Reassure per-test metrics to find which specific test has the most room.

The loop runs until the human interrupts you, period.
