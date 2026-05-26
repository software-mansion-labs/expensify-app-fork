#!/usr/bin/env node
// Behavioral evaluation runner for CLAUDE.md.
//
// For each task file in evaluate/tasks/, runs `claude -p` from the repo root
// so CLAUDE.md is auto-loaded natively (the real behavior, not a simulation).
// Grades each task using a second `claude -p` call (no CLAUDE.md context).
//
// Metrics per task:
//   correctness   — did the agent reach the correct outcome? (true/false)
//   clarifying_qs — clarifying questions asked that CLAUDE.md should answer (count)
//   tool_calls    — actual tool calls from stream, not LLM-inferred (count)
//   hallucinations — commands or paths that don't exist in the repo (count)
//
// Usage (from repo root):
//   node .agent-optimizer/evaluate/validate/eval.js                    # runs eval, saves results/YYYY-MM-DD.md
//   node .agent-optimizer/evaluate/validate/eval.js --no-save          # skip writing the results file
//   node .agent-optimizer/evaluate/validate/eval.js --agent-cwd <path> # run claude -p from a specific directory
//
// --agent-cwd is used by compare.js to run the agent inside a clean worktree
// where .agent-optimizer/ has been removed (prevents answer-key contamination).
//
// Requires: claude CLI logged in (`claude --version` to verify).

const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '..', 'tasks');
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const SAVE = !process.argv.includes('--no-save');

const agentCwdIdx = process.argv.indexOf('--agent-cwd');
const AGENT_CWD = agentCwdIdx !== -1 ? process.argv[agentCwdIdx + 1] : process.cwd();

// ── Parsing ────────────────────────────────────────────────────────────────

function parseTaskFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    const titleMatch = content.match(/^# (.+)$/m);
    const name = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

    const promptMatch = content.match(/## Prompt[^\n]*\n\n>([\s\S]+?)(?=\n\n##)/);
    const prompt = promptMatch ? promptMatch[1].replace(/^> ?/gm, '').trim() : null;

    const passMatch = content.match(/## Pass[^\n]*\n\n([\s\S]+?)(?=\n\n##|$)/);
    const expected = passMatch ? passMatch[1].trim() : null;

    const failMatch = content.match(/## Fail[^\n]*\n\n([\s\S]+?)(?=\n\n##|$)/);
    const negative = failMatch ? failMatch[1].trim() : null;

    if (!prompt) throw new Error(`Could not parse prompt from ${filePath}`);

    return {name, prompt, expected, negative, file: path.basename(filePath)};
}

// ── Claude CLI helpers ─────────────────────────────────────────────────────

// Runs claude with stream-json, printing live tool call names as progress indicators.
// Returns a promise resolving to {text, costUSD, durationMs, numTurns, toolCallCount, tokens}.
function runClaude(prompt, {cwd = process.cwd(), timeout = 120_000, showTools = false} = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn('claude', ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--no-session-persistence'], {cwd, env: process.env});

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill();
            reject(new Error(`claude timed out after ${timeout}ms`));
        }, timeout);

        child.stdout.on('data', (chunk) => {
            stdout += chunk;
            // Print tool names live as they arrive.
            if (showTools) {
                for (const line of chunk.toString().split('\n')) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
                            for (const block of event.message.content) {
                                if (block.type === 'tool_use') {
                                    process.stdout.write(`[${block.name}] `);
                                }
                            }
                        }
                    } catch {}
                }
            }
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            if (timedOut) return;
            if (code !== 0) {
                reject(new Error(stderr || `claude exited with code ${code}`));
                return;
            }

            let text = '';
            let costUSD = 0;
            let durationMs = 0;
            let numTurns = 0;
            let toolCallCount = 0;
            const tokens = {input: 0, output: 0, cacheRead: 0, cacheCreation: 0};

            for (const line of stdout.split('\n')) {
                if (!line.trim()) continue;
                let event;
                try {
                    event = JSON.parse(line);
                } catch {
                    continue;
                }

                if (event.type === 'result') {
                    text = event.result ?? '';
                    costUSD = event.total_cost_usd ?? 0;
                    durationMs = event.duration_ms ?? 0;
                    numTurns = event.num_turns ?? 0;
                    tokens.input = event.usage?.input_tokens ?? 0;
                    tokens.output = event.usage?.output_tokens ?? 0;
                    tokens.cacheRead = event.usage?.cache_read_input_tokens ?? 0;
                    tokens.cacheCreation = event.usage?.cache_creation_input_tokens ?? 0;
                }

                if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
                    for (const block of event.message.content) {
                        if (block.type === 'tool_use') toolCallCount++;
                    }
                }
            }

            resolve({text, costUSD, durationMs, numTurns, toolCallCount, tokens});
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function runTaskClaude(prompt) {
    return runClaude(prompt, {cwd: AGENT_CWD, timeout: 120_000, showTools: true});
}

function runGradingClaude(prompt) {
    return runClaude(prompt, {cwd: require('os').tmpdir(), timeout: 60_000, showTools: false});
}

// ── Grading ────────────────────────────────────────────────────────────────

const GRADING_PROMPT = (taskPrompt, expected, negative, agentResponse, toolCalls) =>
    `
You are a precise grader evaluating a coding agent's response.

TASK PROMPT given to the agent:
${taskPrompt}

EXPECTED GOOD BEHAVIOR:
${expected ?? '(none specified)'}

NEGATIVE SIGNALS (bad outcomes):
${negative ?? '(none specified)'}

ACTUAL TOOL CALL COUNT (measured from session stream): ${toolCalls}

AGENT RESPONSE:
${agentResponse}

Grade the response on these two dimensions. Reply ONLY with a JSON object and nothing else.

correctness: Did the agent reach the correct outcome? true or false.
tool_calls: This is provided above — do NOT grade it yourself. Use the value you were given.

Add a short note for correctness (one sentence max). Be specific — name the exact command, path, or behavior observed.

Reply with this exact structure:
{"correctness": true, "tool_calls": 0, "notes": {"correctness": "..."}}
`.trim();

async function gradeResponse(task, agentResponse, toolCalls) {
    const prompt = GRADING_PROMPT(task.prompt, task.expected, task.negative, agentResponse, toolCalls);
    const {text, costUSD, tokens} = await runGradingClaude(prompt);

    let grade;
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');
        grade = JSON.parse(jsonMatch[0]);
        if (typeof grade.notes !== 'object') {
            grade.notes = {correctness: grade.reasoning ?? ''};
        }
    } catch (e) {
        console.error(`  Warning: could not parse grading response — ${e.message}`);
        grade = {correctness: null, tool_calls: null, notes: {correctness: 'parse error'}};
    }

    // Override tool_calls with the measured value — more reliable than LLM inference.
    grade.tool_calls = toolCalls;

    return {...grade, _grading: {costUSD, tokens}};
}

// ── Formatting ─────────────────────────────────────────────────────────────

function formatResults(taskResults) {
    const date = new Date().toISOString().slice(0, 10);
    const passed = taskResults.filter((r) => r.grade.correctness === true).length;
    const total = taskResults.length;
    const lines = [`# Eval Results — ${date}`, ''];

    const totalCost = taskResults.reduce((s, r) => s + (r.taskRun?.costUSD ?? 0) + (r.grade._grading?.costUSD ?? 0), 0);
    lines.push(`**Passed:** ${passed}/${total}  `);
    lines.push(`**Total cost:** $${totalCost.toFixed(4)}\n`);

    for (const {task, grade, taskRun} of taskResults) {
        const correctLabel = grade.correctness === null ? '?' : grade.correctness ? '✓ pass' : '✗ fail';
        const cost = taskRun ? `$${taskRun.costUSD.toFixed(4)}` : '?';
        const totalInput = taskRun ? taskRun.tokens.input + taskRun.tokens.cacheRead + taskRun.tokens.cacheCreation : '?';
        const duration = taskRun ? `${(taskRun.durationMs / 1000).toFixed(1)}s` : '?';

        lines.push(`## ${task.name}\n`);
        lines.push('| | Value |');
        lines.push('|---|---|');
        lines.push(`| Correctness | ${correctLabel} |`);
        lines.push(`| Tool calls | ${grade.tool_calls ?? '?'} |`);
        lines.push(`| Turns | ${taskRun?.numTurns ?? '?'} |`);
        lines.push(`| Input tokens | ${totalInput} |`);
        lines.push(`| Output tokens | ${taskRun?.tokens.output ?? '?'} |`);
        lines.push(`| Duration | ${duration} |`);
        lines.push(`| Cost | ${cost} |`);
        lines.push('');

        if (grade.notes?.correctness) {
            lines.push(`- ${grade.correctness ? '✓' : '⚠'} **correctness:** ${grade.notes.correctness}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const taskFiles = fs
        .readdirSync(TASKS_DIR)
        .filter((f) => f.endsWith('.md') && f !== 'TASK_TEMPLATE.md')
        .sort();
    if (taskFiles.length === 0) {
        console.error(`eval: no task files found in ${TASKS_DIR}`);
        process.exit(2);
    }

    process.stdout.write('  Warming up cache... ');
    await runTaskClaude('Warmup prompt. Acknowledge with one word.');
    console.log('done.\n');

    console.log(`Running behavioral eval: ${taskFiles.length} task(s)`);
    for (const file of taskFiles) console.log(`  • ${file}`);
    console.log();

    const taskResults = [];

    for (const file of taskFiles) {
        const task = parseTaskFile(path.join(TASKS_DIR, file));
        console.log(`▸ ${task.name}`);

        let taskRun;
        try {
            process.stdout.write('  Running agent... ');
            taskRun = await runTaskClaude(task.prompt);
            console.log(`done.  ($${taskRun.costUSD.toFixed(4)}, ${(taskRun.durationMs / 1000).toFixed(1)}s)`);
        } catch (err) {
            console.error(`\n  Agent run failed: ${err.message}`);
            taskResults.push({task, grade: {correctness: null, clarifying_qs: null, tool_calls: null, hallucinations: null, notes: {}, _grading: {costUSD: 0}}, taskRun: null});
            continue;
        }

        process.stdout.write('  Grading... ');
        const grade = await gradeResponse(task, taskRun.text, taskRun.toolCallCount);
        console.log(`done.  ($${grade._grading.costUSD.toFixed(4)})`);

        const correctLabel = grade.correctness === null ? '?' : grade.correctness ? '✓ pass' : '✗ fail';
        const totalInput = taskRun.tokens.input + taskRun.tokens.cacheRead + taskRun.tokens.cacheCreation;
        console.log(
            `  correct=${correctLabel}  tools=${grade.tool_calls ?? '?'}  turns=${taskRun.numTurns}  in=${totalInput}  out=${taskRun.tokens.output}  ${(taskRun.durationMs / 1000).toFixed(1)}s`,
        );
        if (grade.notes?.correctness) console.log(`  correctness: ${grade.notes.correctness}`);
        console.log();

        taskResults.push({task, grade, taskRun});
    }

    const grades = taskResults.map((r) => r.grade);
    const passed = grades.filter((g) => g.correctness === true).length;
    const totalCost = taskResults.reduce((s, r) => s + (r.taskRun?.costUSD ?? 0) + (r.grade._grading?.costUSD ?? 0), 0);
    const totalInput = taskResults.reduce((s, r) => s + (r.taskRun?.tokens.input ?? 0) + (r.taskRun?.tokens.cacheRead ?? 0) + (r.taskRun?.tokens.cacheCreation ?? 0), 0);
    const totalOutput = taskResults.reduce((s, r) => s + (r.taskRun?.tokens.output ?? 0), 0);

    console.log(`${'─'.repeat(60)}`);
    console.log(`Passed: ${passed}/${grades.length}`);
    console.log(`Total cost: $${totalCost.toFixed(4)}  |  input: ${totalInput}  output: ${totalOutput}`);
    console.log(`─`.repeat(60));

    if (SAVE) {
        fs.mkdirSync(RESULTS_DIR, {recursive: true});
        const date = new Date().toISOString().slice(0, 10);
        const outPath = path.join(RESULTS_DIR, `${date}.md`);
        fs.writeFileSync(outPath, formatResults(taskResults));
        console.log(`\nResults saved to ${path.relative(process.cwd(), outPath)}`);
    }

    process.exit(grades.every((g) => g.correctness === true) ? 0 : 1);
}

main().catch((err) => {
    console.error('eval:', err.message);
    process.exit(1);
});
