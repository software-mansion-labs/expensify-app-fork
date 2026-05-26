#!/usr/bin/env node
// A/B comparison runner for CLAUDE.md.
//
// Creates two clean git worktrees and runs the behavioral eval in each:
//   - Baseline worktree:  HEAD checkout (old CLAUDE.md)
//   - Candidate worktree: HEAD checkout + current working-tree CLAUDE.md copied in
//
// Both worktrees have .agent-optimizer/ removed so the agent can't read the
// task prompts or expected behaviors (answer-key contamination prevention).
// node_modules is symlinked from the main repo to avoid reinstalling.
//
// Usage (from repo root):
//   node .agent-optimizer/evaluate/validate/compare.js
//   node .agent-optimizer/evaluate/validate/compare.js --no-save
//
// Requires: claude CLI logged in.

const {spawnSync, spawn} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = process.cwd();
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const EVAL_SCRIPT = path.join(__dirname, 'eval.js');
const TASKS_DIR = path.join(__dirname, '..', 'tasks');
const SAVE = !process.argv.includes('--no-save');

// ── Worktree helpers ───────────────────────────────────────────────────────

function createWorktree(label) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `claude-md-${label}-`));

    const r = spawnSync('git', ['worktree', 'add', '--detach', dir, 'HEAD'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
    });
    if (r.status !== 0) throw new Error(`git worktree add failed: ${r.stderr}`);

    // Remove .agent-optimizer so the agent can't read the answer key.
    const agentOptDir = path.join(dir, '.agent-optimizer');
    if (fs.existsSync(agentOptDir)) fs.rmSync(agentOptDir, {recursive: true, force: true});

    // Symlink node_modules from the main repo to avoid reinstalling.
    const nmLink = path.join(dir, 'node_modules');
    const nmSource = path.join(REPO_ROOT, 'node_modules');
    if (fs.existsSync(nmSource) && !fs.existsSync(nmLink)) {
        fs.symlinkSync(nmSource, nmLink, 'dir');
    }

    return dir;
}

function removeWorktree(dir) {
    // Remove symlink before git worktree remove to avoid git trying to clean it.
    const nmLink = path.join(dir, 'node_modules');
    if (fs.existsSync(nmLink) && fs.lstatSync(nmLink).isSymbolicLink()) {
        fs.unlinkSync(nmLink);
    }
    spawnSync('git', ['worktree', 'remove', '--force', dir], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
    });
}

// ── Eval runner ────────────────────────────────────────────────────────────

// Runs eval streaming output live to the terminal while also capturing it for parsing.
function runEvalCapture(agentCwd) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [EVAL_SCRIPT, '--no-save', '--agent-cwd', agentCwd], {
            cwd: REPO_ROOT,
            env: process.env,
        });

        let out = '';

        child.stdout.on('data', (chunk) => {
            process.stdout.write(chunk);
            out += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            process.stderr.write(chunk);
            out += chunk.toString();
        });

        const timer = setTimeout(() => {
            child.kill();
            reject(new Error('eval timed out'));
        }, 300_000);

        child.on('close', () => {
            clearTimeout(timer);
            const tasks = [];
            let current = null;

            for (const line of out.split('\n')) {
                const taskMatch = line.match(/^▸ (.+)/);
                if (taskMatch) {
                    current = {
                        name: taskMatch[1].trim(),
                        correctness: null,
                        tool_calls: null,
                        costUSD: 0,
                        numTurns: null,
                        inputTokens: null,
                        outputTokens: null,
                        durationMs: null,
                        notes: {},
                    };
                    tasks.push(current);
                }
                const gradeMatch = line.match(/correct=(✓|✗).*?tools=(\d+)\s+turns=(\d+)\s+in=(\d+)\s+out=(\d+)\s+([\d.]+)s/);
                if (gradeMatch && current) {
                    current.correctness = gradeMatch[1] === '✓';
                    current.tool_calls = parseInt(gradeMatch[2], 10);
                    current.numTurns = parseInt(gradeMatch[3], 10);
                    current.inputTokens = parseInt(gradeMatch[4], 10);
                    current.outputTokens = parseInt(gradeMatch[5], 10);
                    current.durationMs = parseFloat(gradeMatch[6]) * 1000;
                }
                const costMatch = line.match(/Running agent.*\(\$([0-9.]+)/);
                if (costMatch && current) current.costUSD += parseFloat(costMatch[1]);
                const noteMatch = line.match(/^\s{2}(correctness): (.+)$/);
                if (noteMatch && current) current.notes[noteMatch[1]] = noteMatch[2].trim();
            }

            const totalCostMatch = out.match(/Total cost: \$([0-9.]+)/);
            const totalCost = totalCostMatch ? parseFloat(totalCostMatch[1]) : 0;

            resolve({tasks, totalCost});
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

// ── Task file loader ───────────────────────────────────────────────────────

function loadTaskMeta() {
    const meta = {};
    for (const file of fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.md') && f !== 'TASK_TEMPLATE.md')) {
        const content = fs.readFileSync(path.join(TASKS_DIR, file), 'utf8');
        const titleMatch = content.match(/^# (.+)$/m);
        const name = titleMatch ? titleMatch[1] : file;
        const promptMatch = content.match(/## Prompt[^\n]*\n\n>([\s\S]+?)(?=\n\n##)/);
        const prompt = promptMatch ? promptMatch[1].replace(/^> ?/gm, '').trim() : null;
        const passMatch = content.match(/## Pass[^\n]*\n\n([\s\S]+?)(?=\n\n##|$)/);
        const expected = passMatch ? passMatch[1].trim() : null;
        meta[name] = {prompt, expected};
    }
    return meta;
}

// ── Delta formatting ───────────────────────────────────────────────────────

function fmtDelta(b, c, {lowerIsBetter = true, isBoolean = false} = {}) {
    if (isBoolean) {
        if (b === c) return '— ⚪';
        return c ? 'improved 🟢' : 'worsened 🔴';
    }
    if (b == null || c == null) return '?';
    if (b === 0 && c === 0) return '— ⚪';
    if (b === 0) return c > 0 ? (lowerIsBetter ? 'worsened 🔴' : 'improved 🟢') : '— ⚪';
    const pct = ((c - b) / b) * 100;
    if (Math.abs(pct) < 1) return '— ⚪';
    const improved = lowerIsBetter ? pct < 0 : pct > 0;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}% ${improved ? '🟢' : '🔴'}`;
}

// ── Report ─────────────────────────────────────────────────────────────────

function formatReport(baseline, candidate) {
    const date = new Date().toISOString().slice(0, 10);
    const taskMeta = loadTaskMeta();
    const lines = [`# Comparison Report — ${date}`, ''];

    // ── Summary header ────────────────────────────────────────────────────
    const bPassed = baseline.tasks.filter((t) => t.correctness === true).length;
    const cPassed = candidate.tasks.filter((t) => t.correctness === true).length;
    const n = baseline.tasks.length;
    const bAvgCost = baseline.tasks.reduce((s, t) => s + (t.costUSD ?? 0), 0) / Math.max(n, 1);
    const cAvgCost = candidate.tasks.reduce((s, t) => s + (t.costUSD ?? 0), 0) / Math.max(n, 1);
    const bAvgOut = baseline.tasks.reduce((s, t) => s + (t.outputTokens ?? 0), 0) / Math.max(n, 1);
    const cAvgOut = candidate.tasks.reduce((s, t) => s + (t.outputTokens ?? 0), 0) / Math.max(n, 1);

    const successChange = cPassed > bPassed ? `improved ${bPassed}/${n} → ${cPassed}/${n}` : cPassed < bPassed ? `regressed ${bPassed}/${n} → ${cPassed}/${n}` : `unchanged ${cPassed}/${n}`;

    lines.push(`**Task success:** ${successChange}  `);
    lines.push(`**Avg cost/task:** $${bAvgCost.toFixed(4)} → $${cAvgCost.toFixed(4)} (${fmtDelta(bAvgCost, cAvgCost)})  `);
    lines.push(`**Avg output tokens:** ${Math.round(bAvgOut)} → ${Math.round(cAvgOut)} (${fmtDelta(bAvgOut, cAvgOut)})`);
    lines.push('');

    // ── Per-task sections ─────────────────────────────────────────────────
    const names = [...new Set([...baseline.tasks.map((t) => t.name), ...candidate.tasks.map((t) => t.name)])];
    for (const name of names) {
        const b = baseline.tasks.find((t) => t.name === name) ?? {};
        const c = candidate.tasks.find((t) => t.name === name) ?? {};
        const meta = taskMeta[name] ?? {};

        const fmtCorrect = (v) => (v == null ? '?' : v ? '✓ pass' : '✗ fail');
        const dur = (ms) => (ms != null ? `${(ms / 1000).toFixed(1)}s` : '?');

        lines.push(`## ${name}`);
        lines.push('');
        if (meta.prompt) lines.push(`**Prompt:** ${meta.prompt}`);
        lines.push('');
        if (meta.expected) {
            lines.push('**Expected:**');
            lines.push(meta.expected);
        }
        lines.push('');
        lines.push('| | Baseline (HEAD) | Candidate | Δ |');
        lines.push('|---|---|---|---|');
        lines.push(`| Correctness | ${fmtCorrect(b.correctness)} | ${fmtCorrect(c.correctness)} | ${fmtDelta(b.correctness, c.correctness, {isBoolean: true})} |`);
        lines.push(`| Tool calls | ${b.tool_calls ?? '?'} | ${c.tool_calls ?? '?'} | ${fmtDelta(b.tool_calls, c.tool_calls)} |`);
        lines.push(`| Turns | ${b.numTurns ?? '?'} | ${c.numTurns ?? '?'} | ${fmtDelta(b.numTurns, c.numTurns)} |`);
        lines.push(`| Input tokens | ${b.inputTokens ?? '?'} | ${c.inputTokens ?? '?'} | ${fmtDelta(b.inputTokens, c.inputTokens)} |`);
        lines.push(`| Output tokens | ${b.outputTokens ?? '?'} | ${c.outputTokens ?? '?'} | ${fmtDelta(b.outputTokens, c.outputTokens)} |`);
        lines.push(`| Duration | ${dur(b.durationMs)} | ${dur(c.durationMs)} | ${fmtDelta(b.durationMs, c.durationMs)} |`);
        lines.push(`| Cost | $${(b.costUSD ?? 0).toFixed(4)} | $${(c.costUSD ?? 0).toFixed(4)} | ${fmtDelta(b.costUSD, c.costUSD)} |`);
        lines.push('');

        const bNotes = b.notes ?? {};
        const cNotes = c.notes ?? {};
        if (bNotes.correctness || cNotes.correctness) {
            lines.push('**Grader notes**');
            if (bNotes.correctness) lines.push(`- Baseline: ${bNotes.correctness}`);
            if (cNotes.correctness) lines.push(`- Candidate: ${cNotes.correctness}`);
            lines.push('');
        }
    }

    return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('── Setting up worktrees ──────────────────────────────────────');

    let baselineDir, candidateDir;
    try {
        process.stdout.write('Creating baseline worktree (HEAD)... ');
        baselineDir = createWorktree('baseline');
        console.log('done.');

        process.stdout.write('Creating candidate worktree (HEAD + new CLAUDE.md)... ');
        candidateDir = createWorktree('candidate');
        // Overwrite CLAUDE.md with the current working tree version.
        fs.copyFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), path.join(candidateDir, 'CLAUDE.md'));
        console.log('done.');

        // Run both evals.
        console.log('\n── Baseline run (HEAD) ───────────────────────────────────────');
        const baseline = await runEvalCapture(baselineDir);

        console.log('\n── Candidate run (new CLAUDE.md) ─────────────────────────────');
        const candidate = await runEvalCapture(candidateDir);

        const bPassed = baseline.tasks.filter((t) => t.correctness === true).length;
        const cPassed = candidate.tasks.filter((t) => t.correctness === true).length;
        const n = baseline.tasks.length;

        console.log(`\n${'─'.repeat(62)}`);
        console.log(`Baseline passed:  ${bPassed}/${n}   cost: $${baseline.totalCost.toFixed(4)}`);
        console.log(`Candidate passed: ${cPassed}/${n}   cost: $${candidate.totalCost.toFixed(4)}`);
        console.log(`─`.repeat(62));

        if (SAVE) {
            fs.mkdirSync(RESULTS_DIR, {recursive: true});
            const date = new Date().toISOString().slice(0, 10);
            const outPath = path.join(RESULTS_DIR, `${date}-comparison.md`);
            fs.writeFileSync(outPath, formatReport(baseline, candidate));
            console.log(`\nReport saved to ${path.relative(REPO_ROOT, outPath)}`);
        }

        process.exit(cPassed < bPassed ? 1 : 0);
    } finally {
        if (baselineDir) {
            process.stdout.write('Removing baseline worktree... ');
            removeWorktree(baselineDir);
            console.log('done.');
        }
        if (candidateDir) {
            process.stdout.write('Removing candidate worktree... ');
            removeWorktree(candidateDir);
            console.log('done.');
        }
    }
}

main().catch((err) => {
    console.error('compare:', err.message);
    process.exit(1);
});
