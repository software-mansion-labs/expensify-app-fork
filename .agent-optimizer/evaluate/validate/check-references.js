#!/usr/bin/env node
// Verifies that every external reference in CLAUDE.md resolves:
//   - Every .claude/skills/<name>/SKILL.md path must exist on disk (P6).
//   - Every `npm run X` must match a script in package.json (P5).
//
// See .agent-optimizer/research/principles.md (P5, P6).

const fs = require('fs');

const file = process.argv[2] ?? 'CLAUDE.md';

if (!fs.existsSync(file)) {
    console.error(`check-references: file not found: ${file}`);
    process.exit(2);
}

const content = fs.readFileSync(file, 'utf8');
const errors = [];

// Skill paths must resolve on disk.
const skillPathRe = /\.claude\/skills\/([\w-]+)\/SKILL\.md/g;
for (const match of content.matchAll(skillPathRe)) {
    if (!fs.existsSync(match[0])) {
        errors.push(`${file}: cited skill path missing: ${match[0]} — violates P6 (see .agent-optimizer/research/principles.md, P6).`);
    }
}

// npm scripts must exist in package.json.
if (fs.existsSync('package.json')) {
    let scripts;
    try {
        scripts = new Set(Object.keys(JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts ?? {}));
    } catch (e) {
        errors.push(`package.json: failed to parse: ${e.message}`);
    }

    if (scripts) {
        const lines = content.split('\n');
        const npmRe = /npm run ([\w-]+)/g;
        for (let i = 0; i < lines.length; i++) {
            for (const match of lines[i].matchAll(npmRe)) {
                if (!scripts.has(match[1])) {
                    errors.push(`${file}:${i + 1}: 'npm run ${match[1]}' references a script not in package.json — violates P5 (see .agent-optimizer/research/principles.md, P5).`);
                }
            }
        }
    }
}

if (errors.length > 0) {
    console.error('CLAUDE.md reference drift detected:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
}

console.log(`${file}: references OK.`);
