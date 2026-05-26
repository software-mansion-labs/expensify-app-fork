#!/usr/bin/env node
// Enforces Q1 Path A portability constraints:
//   - No top-of-file YAML frontmatter (breaks non-Claude-Code harnesses).
//   - No @import directives (CLAUDE.md must be self-contained).
//   - No slash-skill shorthands (/skill-name) without the explicit
//     .claude/skills/<name>/SKILL.md path on the same line (H5).
//
// See .agent-optimizer/research/sources.md (H5, Q1).

const fs = require('fs');
const path = require('path');

const file = process.argv[2] ?? 'CLAUDE.md';

if (!fs.existsSync(file)) {
    console.error(`check-portability: file not found: ${file}`);
    process.exit(2);
}

const content = fs.readFileSync(file, 'utf8');
const errors = [];

// No YAML frontmatter.
if (content.trimStart().startsWith('---')) {
    errors.push(`${file}: top-of-file YAML frontmatter is forbidden per Q1 Path A — see .agent-optimizer/research/sources.md.`);
}

// No @import.
if (content.includes('@import')) {
    errors.push(`${file}: '@import' is forbidden per Q1 Path A (CLAUDE.md must be self-contained).`);
}

// Slash-skill shorthands must be accompanied by explicit path on the same line (H5).
const skillsDir = '.claude/skills';
const existingSkills = new Set();
if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir)) {
        if (fs.statSync(path.join(skillsDir, entry)).isDirectory() && fs.existsSync(path.join(skillsDir, entry, 'SKILL.md'))) {
            existingSkills.add(entry);
        }
    }
}

const skillPathRe = /\.claude\/skills\/([\w-]+)\/SKILL\.md/g;
const slashSkillRe = /(?<![/\w.])\/(?!(\/|https?:))([\w-]+)(?![\w./])/g;
const urlRe = /https?:\/\/\S+/g;

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sanitized = line.replace(urlRe, '');

    const pathsInLine = new Set([...line.matchAll(skillPathRe)].map((m) => m[1]));
    for (const match of sanitized.matchAll(slashSkillRe)) {
        const name = match[2];
        if (existingSkills.has(name) && !pathsInLine.has(name)) {
            errors.push(
                `${file}:${i + 1}: slash-shorthand '/${name}' without explicit \`.claude/skills/${name}/SKILL.md\` on the same line — violates H5 (see .agent-optimizer/research/sources.md, Q1 Path A portability).`,
            );
        }
    }
}

if (errors.length > 0) {
    console.error('CLAUDE.md portability drift detected:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
}

console.log(`${file}: portability OK.`);
