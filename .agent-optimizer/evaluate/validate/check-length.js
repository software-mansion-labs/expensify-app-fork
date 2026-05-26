#!/usr/bin/env node
// Enforces P4: CLAUDE.md must stay under 200 lines.
//
// Source: S1 ("Size: target under 200 lines per CLAUDE.md file. Longer files
// consume more context and reduce adherence.")
// See .agent-optimizer/research/principles.md (P4).

const fs = require('fs');

const file = process.argv[2] ?? 'CLAUDE.md';
const cap = 200;

if (!fs.existsSync(file)) {
    console.error(`check-length: file not found: ${file}`);
    process.exit(2);
}

const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);

if (lines > cap) {
    console.error(`CLAUDE.md length drift detected:`);
    console.error(`  - ${file}: ${lines} lines, cap is ${cap} per P4 — see .agent-optimizer/research/principles.md (P4, Anthropic adherence cliff).`);
    process.exit(1);
}

console.log(`${file}: length OK (${lines} lines, cap ${cap}).`);
