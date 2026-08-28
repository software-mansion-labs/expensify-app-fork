/* eslint-disable no-new-func, no-console -- this evaluates a workflow's script body on purpose, and printing the report is the point. */
/*
 * Runs the "Resolve the baseline" github-script body out of the `postBundleSizeComment` composite action
 * against mocked API responses, so the branch it takes on each shape of history is checked without pushing
 * anything. This is the only coverage that logic has.
 *
 *   node ./POC-baselineResolverCheck.js
 *
 * POC scaffolding, not part of any test suite. Before the real pull request, this belongs in
 * `tests/tooling/` as a bun:test file, or the resolver should move into a module the workflow requires so
 * it can be tested without reading it back out of YAML.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = __dirname;
const yaml = require(path.join(REPO, 'node_modules/js-yaml'));

// The step reads the measurement's meta file from the working directory, so give it one.
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-resolver-'));
fs.mkdirSync(path.join(workDir, 'measure'));
fs.writeFileSync(
    path.join(workDir, 'measure/bundle-size-meta.json'),
    JSON.stringify({prNumber: 7, headSha: 'h'.repeat(40), baseSha: 'b'.repeat(40), baseRef: 'main', event: 'pull_request'}),
);
process.chdir(workDir);

const action = yaml.load(fs.readFileSync(path.join(REPO, '.github/actions/composite/postBundleSizeComment/action.yml'), 'utf8'));
const body = action.runs.steps.find((step) => step.name === 'Resolve the baseline').with.script;
const run = new Function('github', 'context', 'core', 'require', `return (async () => {\n${body}\n})();`);

const MERGE_BASE = 'm'.repeat(40);
const commit = (name) => name.padEnd(40, '0');

/**
 * history: [sha, ...] newest first starting at the merge base.
 * measured: [[sha, runId], ...] as the API returns them, newest run first, so one sha can appear twice.
 * live: the runIds that still hold an unexpired artifact.
 */
async function resolve({history, measured, live}) {
    const outputs = {};
    const log = [];
    const core = {
        setOutput: (key, value) => {
            outputs[key] = value;
        },
        info: (message) => log.push(`info: ${message}`),
        warning: (message) => log.push(`warning: ${message}`),
    };
    let artifactCalls = 0;
    const github = {
        rest: {
            repos: {
                compareCommitsWithBasehead: async () => ({data: {merge_base_commit: {sha: MERGE_BASE}}}),
                listCommits: async () => ({data: history.map((sha) => ({sha}))}),
            },
            actions: {
                listWorkflowRuns: async (parameters) => {
                    // 'main' is what the meta file records as the base branch, NOT the default branch in the
                    // mocked payload - so this asserts the base branch is what the lookup follows.
                    if (parameters.branch !== 'main' || parameters.event !== 'push' || parameters.status !== 'success') {
                        throw new Error(`unexpected run query: ${JSON.stringify(parameters)}`);
                    }
                    // The API returns newest first; duplicate SHAs happen when a commit's run is re-run.
                    return {data: {workflow_runs: measured.map(([sha, id]) => ({head_sha: sha, id}))}};
                },
                listWorkflowRunArtifacts: async ({run_id}) => {
                    artifactCalls += 1;
                    return {data: {artifacts: [{name: 'bundle-size', expired: !live.has(run_id)}]}};
                },
            },
        },
    };
    const context = {repo: {owner: 'Expensify', repo: 'App'}, payload: {repository: {default_branch: 'some-other-default'}}};
    await run(github, context, core, require);
    return {outputs, log, artifactCalls};
}

function check(name, actual, expected) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : `\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`}`);
    return pass;
}

(async () => {
    let ok = true;

    // 1. The merge base has a measurement: that is the baseline, and no ancestor is considered.
    let result = await resolve({
        history: [MERGE_BASE, commit('a'), commit('b')],
        measured: [
            [MERGE_BASE, 11],
            [commit('a'), 12],
        ],
        live: new Set([11, 12]),
    });
    ok = check('merge base measured -> its run', [result.outputs['run-id'], result.outputs['merge-base-sha'], result.artifactCalls], [11, MERGE_BASE, 1]) && ok;

    // 2. The merge base was path-filtered out. The nearest measured ancestor stands in.
    result = await resolve({
        history: [MERGE_BASE, commit('a'), commit('b')],
        measured: [
            [commit('b'), 22],
            [commit('a'), 21],
        ],
        live: new Set([21, 22]),
    });
    ok = check('merge base unmeasured -> nearest ancestor', [result.outputs['run-id'], result.artifactCalls], [21, 1]) && ok;

    // 3. The nearest measured ancestor's artifact has expired, so it is skipped rather than downloaded.
    result = await resolve({
        history: [MERGE_BASE, commit('a'), commit('b')],
        measured: [
            [commit('a'), 21],
            [commit('b'), 22],
        ],
        live: new Set([22]),
    });
    ok = check('expired artifact -> next ancestor', [result.outputs['run-id'], result.artifactCalls], [22, 2]) && ok;

    // 4. Nothing in the window has a measurement: no baseline, and it says so instead of inventing one.
    result = await resolve({history: [MERGE_BASE, commit('a')], measured: [], live: new Set()});
    ok = check('nothing measured -> no run id', [result.outputs['run-id'], result.log.at(-1).startsWith('warning:')], [undefined, true]) && ok;

    // 5. A tip-of-main run is never chosen: only ancestors of the merge base are candidates.
    result = await resolve({history: [MERGE_BASE, commit('a')], measured: [[commit('tip'), 99]], live: new Set([99])});
    ok = check('main tip is not a candidate', [result.outputs['run-id'], result.artifactCalls], [undefined, 0]) && ok;

    // 6. The expired-artifact walk is capped at five checks rather than crawling back through history.
    const long = [MERGE_BASE, ...Array.from({length: 20}, (unused, index) => commit(`c${index}`))];
    const allMeasured = long.map((sha, index) => [sha, 100 + index]);
    result = await resolve({history: long, measured: allMeasured, live: new Set()});
    ok = check('capped at five artifact checks', [result.outputs['run-id'], result.artifactCalls], [undefined, 5]) && ok;

    // 7. A re-run commit is listed twice, newest first. The newest run is the one that is used.
    result = await resolve({
        history: [MERGE_BASE, commit('a')],
        measured: [
            [MERGE_BASE, 32],
            [MERGE_BASE, 31],
        ],
        live: new Set([31, 32]),
    });
    ok = check('re-run commit -> newest run wins', [result.outputs['run-id']], [32]) && ok;

    console.log(ok ? '\nall checks passed' : '\nFAILURES');
    process.exitCode = ok ? 0 : 1;
})();
