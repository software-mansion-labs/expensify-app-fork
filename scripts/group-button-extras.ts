import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(PROJECT_ROOT, 'button-props-analysis.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'button-extra-visual-groups.json');

interface PropUsage {
    prop: string;
    value: string;
    type: 'static' | 'dynamic' | 'handler' | 'spread' | 'boolean-shorthand';
}

interface ButtonUsage {
    file: string;
    line: number;
    props: PropUsage[];
}

interface AnalysisData {
    summary: {totalButtonUsages: number; totalFiles: number};
    propStatistics: unknown[];
    detailedUsages: ButtonUsage[];
}

// Props to completely ignore (non-visual + base visual)
const IGNORED_PROPS = new Set([
    // non-visual
    'onPress',
    'onLongPress',
    'onPressIn',
    'onPressOut',
    'onMouseDown',
    'onLayout',
    'sentryLabel',
    'testID',
    'accessibilityLabel',
    'id',
    'ref',
    'key',
    'pressOnEnter',
    'enterKeyEventListenerPriority',
    'allowBubble',
    'isPressOnEnterActive',
    'isLongPressDisabled',
    'shouldEnableHapticFeedback',
    // base visual - skip these for this grouping
    'success',
    'danger',
    'link',
    'extraSmall',
    'small',
    'medium',
    'large',
    'isLoading',
    'isDisabled',
]);

function isTruthyValue(value: string, type: string): boolean {
    if (type === 'boolean-shorthand') return true;
    if (value === 'true') return true;
    if (value === 'false' || value === 'undefined' || value === 'null') return false;
    return true;
}

interface ExtraFingerprint {
    hasText: boolean;
    hasIcon: boolean;
    hasIconRight: boolean;
    hasSecondLineText: boolean;
    hasChildren: boolean;
    shouldShowRightIcon: boolean;
    shouldUseDefaultHover: string;
    booleanFlags: Record<string, string>;
    styleOverrides: Record<string, string>;
    colorOverrides: Record<string, string>;
}

function buildFingerprint(usage: ButtonUsage): ExtraFingerprint {
    const fp: ExtraFingerprint = {
        hasText: false,
        hasIcon: false,
        hasIconRight: false,
        hasSecondLineText: false,
        hasChildren: false,
        shouldShowRightIcon: false,
        shouldUseDefaultHover: 'true',
        booleanFlags: {},
        styleOverrides: {},
        colorOverrides: {},
    };

    const BOOLEAN_FLAGS = new Set(['shouldRemoveRightBorderRadius', 'shouldRemoveLeftBorderRadius', 'shouldBlendOpacity', 'shouldStayNormalOnDisable', 'isContentCentered', 'isNested']);

    const STYLE_PROPS = new Set(['style', 'innerStyles', 'textStyles', 'textHoverStyles', 'hoverStyles', 'disabledStyle', 'iconStyles', 'iconRightStyles', 'iconWrapperStyles']);

    const COLOR_PROPS = new Set(['iconFill', 'iconHoverFill', 'iconRightFill', 'iconRightHoverFill', 'iconRight']);

    // Outer margin or width-only style tokens — these don't change button's visual appearance
    const LAYOUT_ONLY_PATTERN = /^styles\.(m\d|mt\d|mb\d|ml\d|mr\d|mh\d|mv\d|mx\d|my\d|mAuto|mtAuto|mbAuto|mlAuto|mrAuto|w\d|w100|flex1|flexGrow1|flexShrink\d|flexShrink0)$/;

    function isLayoutOnlyToken(token: string): boolean {
        const trimmed = token.trim();
        if (!trimmed || trimmed === '{}') return true;
        // Direct style reference: styles.mt4, styles.w100, styles.flex1
        if (LAYOUT_ONLY_PATTERN.test(trimmed)) return true;
        // Conditional that resolves to a layout token or empty: shouldUseNarrowLayout && styles.flex1
        if (/&&\s*styles\.(m[tblrhvxy]?\d|flex\w*\d|w\d+|mb\d)$/.test(trimmed)) return true;
        // Conditional with ternary resolving to margin tokens: canUseTouchScreen ? styles.mt5 : styles.mt0
        if (/\?\s*styles\.(m[tblrhvxy]?\d+)\s*:\s*styles\.(m[tblrhvxy]?\d+)$/.test(trimmed)) return true;
        return false;
    }

    function isLayoutOnlyStyle(value: string): boolean {
        // Direct reference: styles.w100, styles.mt4
        if (LAYOUT_ONLY_PATTERN.test(value)) return true;
        // Array syntax: [[styles.w100]], [[styles.mt4, styles.mb3]]
        const arrayMatch = value.match(/^\[\[(.*)\]\]$/);
        if (arrayMatch) {
            const tokens = arrayMatch[1].split(',');
            return tokens.every(isLayoutOnlyToken);
        }
        return false;
    }

    for (const prop of usage.props) {
        const {prop: name, value, type} = prop;

        if (IGNORED_PROPS.has(name)) continue;
        if (name.startsWith('{...')) continue;

        if (name === 'text') {
            fp.hasText = true;
            continue;
        }
        if (name === 'icon') {
            fp.hasIcon = isTruthyValue(value, type);
            continue;
        }
        if (name === 'secondLineText') {
            fp.hasSecondLineText = isTruthyValue(value, type);
            continue;
        }
        if (name === 'children') {
            fp.hasChildren = true;
            continue;
        }
        if (name === 'shouldShowRightIcon') {
            fp.shouldShowRightIcon = isTruthyValue(value, type);
            continue;
        }
        if (name === 'shouldUseDefaultHover') {
            fp.shouldUseDefaultHover = value === 'false' ? 'false' : type === 'dynamic' ? 'dynamic' : 'true';
            continue;
        }
        if (BOOLEAN_FLAGS.has(name)) {
            const resolved = type === 'boolean-shorthand' || value === 'true' ? 'true' : value === 'false' ? 'false' : 'dynamic';
            if (resolved !== 'false') {
                fp.booleanFlags[name] = resolved;
            }
            continue;
        }
        if (STYLE_PROPS.has(name)) {
            // Only track style if it's NOT purely layout (outer margin / width)
            if (name === 'style' && isLayoutOnlyStyle(value)) continue;
            fp.styleOverrides[name] = value;
            continue;
        }
        if (COLOR_PROPS.has(name)) {
            fp.colorOverrides[name] = value;
            continue;
        }
        if (name === 'primaryTextNumberOfLines') {
            fp.booleanFlags['primaryTextNumberOfLines'] = value;
            continue;
        }
    }

    return fp;
}

function fingerprintToKey(fp: ExtraFingerprint): string {
    const parts: string[] = [];

    if (fp.hasText) parts.push('text:yes');
    if (fp.hasIcon) parts.push('icon:yes');
    if (fp.hasSecondLineText) parts.push('secondLine:yes');
    if (fp.hasChildren) parts.push('children:yes');
    if (fp.shouldShowRightIcon) parts.push('rightIcon:yes');
    if (fp.shouldUseDefaultHover !== 'true') parts.push(`defaultHover:${fp.shouldUseDefaultHover}`);

    const sortedFlags = Object.entries(fp.booleanFlags).sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of sortedFlags) {
        parts.push(`${k}:${v}`);
    }

    const sortedStyles = Object.entries(fp.styleOverrides).sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of sortedStyles) {
        parts.push(`${k}=${v}`);
    }

    const sortedColors = Object.entries(fp.colorOverrides).sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of sortedColors) {
        parts.push(`${k}=${v}`);
    }

    return parts.length === 0 ? '(no extras - plain button)' : parts.join(' | ');
}

function main() {
    const data: AnalysisData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));

    const groups: Map<string, {fingerprint: ExtraFingerprint; usages: Array<{file: string; line: number}>}> = new Map();

    for (const usage of data.detailedUsages) {
        const fp = buildFingerprint(usage);
        const key = fingerprintToKey(fp);

        if (!groups.has(key)) {
            groups.set(key, {fingerprint: fp, usages: []});
        }
        groups.get(key)!.usages.push({file: usage.file, line: usage.line});
    }

    const sorted = [...groups.entries()].sort(([, a], [, b]) => b.usages.length - a.usages.length);

    const output = {
        totalGroups: sorted.length,
        totalUsages: data.detailedUsages.length,
        groups: sorted.map(([key, group], index) => ({
            groupId: index + 1,
            count: group.usages.length,
            visualSignature: key,
            fingerprint: group.fingerprint,
            files: group.usages,
        })),
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.error(`Written to ${OUTPUT_PATH}`);

    console.log('=== BUTTON EXTRA-VISUAL GROUPS (ignoring size/variant/isLoading/isDisabled) ===\n');
    console.log(`Total unique extra-visual configurations: ${sorted.length}`);
    console.log(`Total Button usages: ${data.detailedUsages.length}\n`);

    for (const [key, group] of sorted) {
        console.log(`[${group.usages.length}x] ${key}`);
        for (const u of group.usages) {
            console.log(`    ${u.file}:${u.line}`);
        }
        console.log();
    }

    // Distribution
    const countBuckets: Record<string, number> = {};
    for (const [, group] of sorted) {
        const bucket = group.usages.length === 1 ? '1 (unique)' : group.usages.length <= 3 ? '2-3' : group.usages.length <= 10 ? '4-10' : '10+';
        countBuckets[bucket] = (countBuckets[bucket] || 0) + 1;
    }
    console.log('=== DISTRIBUTION ===\n');
    for (const [bucket, count] of Object.entries(countBuckets).sort()) {
        console.log(`  ${bucket} usages: ${count} groups`);
    }
}

main();
