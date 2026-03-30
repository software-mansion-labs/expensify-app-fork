import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(PROJECT_ROOT, 'button-props-analysis.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'button-visual-groups.json');

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

// Props that have NO impact on visual appearance
const NON_VISUAL_PROPS = new Set([
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
]);

// Props where we only care about presence (true/false), not value
const PRESENCE_ONLY_PROPS = new Set(['text', 'icon', 'secondLineText', 'children']);

// Props that are dynamic by nature - just note presence
const DYNAMIC_BEHAVIOR_PROPS = new Set(['isLoading', 'isDisabled']);

// Size props - mutually exclusive
const SIZE_PROPS = ['extraSmall', 'small', 'medium', 'large'] as const;

// Variant props
const VARIANT_PROPS = ['success', 'danger', 'link'] as const;

// Boolean visual flags
const BOOLEAN_VISUAL_PROPS = new Set([
    'shouldShowRightIcon',
    'shouldRemoveRightBorderRadius',
    'shouldRemoveLeftBorderRadius',
    'shouldBlendOpacity',
    'shouldStayNormalOnDisable',
    'isContentCentered',
    'isNested',
]);

// Style props - we care about the actual value
const STYLE_PROPS = new Set(['style', 'innerStyles', 'textStyles', 'textHoverStyles', 'hoverStyles', 'disabledStyle', 'iconStyles', 'iconRightStyles', 'iconWrapperStyles']);

// Color override props
const COLOR_PROPS = new Set(['iconFill', 'iconHoverFill', 'iconRightFill', 'iconRightHoverFill', 'iconRight']);

function isTruthyValue(value: string, type: string): boolean {
    if (type === 'boolean-shorthand') return true;
    if (value === 'true') return true;
    if (value === 'false' || value === 'undefined' || value === 'null') return false;
    // Dynamic values that evaluate at runtime - treat as "set"
    if (type === 'dynamic') return true;
    // Static non-false values
    return true;
}

function resolveStaticBoolean(value: string, type: string): 'true' | 'false' | 'dynamic' {
    if (type === 'boolean-shorthand' || value === 'true') return 'true';
    if (value === 'false') return 'false';
    return 'dynamic';
}

interface VisualFingerprint {
    size: string;
    variant: string;
    hasText: boolean;
    hasIcon: boolean;
    hasIconRight: boolean;
    hasSecondLineText: boolean;
    hasChildren: boolean;
    hasIsLoading: boolean;
    hasIsDisabled: boolean;
    booleanFlags: Record<string, string>; // prop -> 'true'|'false'|'dynamic'
    styleOverrides: Record<string, string>; // prop -> value or 'custom'
    colorOverrides: Record<string, string>;
    shouldUseDefaultHover: string;
}

function buildFingerprint(usage: ButtonUsage): VisualFingerprint {
    const fp: VisualFingerprint = {
        size: 'medium', // default
        variant: 'default',
        hasText: false,
        hasIcon: false,
        hasIconRight: false,
        hasSecondLineText: false,
        hasChildren: false,
        hasIsLoading: false,
        hasIsDisabled: false,
        booleanFlags: {},
        styleOverrides: {},
        colorOverrides: {},
        shouldUseDefaultHover: 'true', // default
    };

    const sizeFlags: Record<string, string> = {};
    const variantFlags: Record<string, string> = {};

    for (const prop of usage.props) {
        const {prop: name, value, type} = prop;

        // Skip non-visual props
        if (NON_VISUAL_PROPS.has(name)) continue;
        // Skip spread markers
        if (name.startsWith('{...')) continue;

        // Presence-only props
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

        // Dynamic behavior props
        if (name === 'isLoading') {
            fp.hasIsLoading = true;
            continue;
        }
        if (name === 'isDisabled') {
            fp.hasIsDisabled = true;
            continue;
        }

        // Size props
        if ((SIZE_PROPS as readonly string[]).includes(name)) {
            sizeFlags[name] = resolveStaticBoolean(value, type);
            continue;
        }

        // Variant props
        if ((VARIANT_PROPS as readonly string[]).includes(name)) {
            variantFlags[name] = resolveStaticBoolean(value, type);
            continue;
        }

        // shouldUseDefaultHover
        if (name === 'shouldUseDefaultHover') {
            fp.shouldUseDefaultHover = resolveStaticBoolean(value, type);
            continue;
        }

        // Boolean visual flags
        if (BOOLEAN_VISUAL_PROPS.has(name)) {
            const resolved = resolveStaticBoolean(value, type);
            if (resolved !== 'false') {
                fp.booleanFlags[name] = resolved;
            }
            continue;
        }

        // Style props
        if (STYLE_PROPS.has(name)) {
            fp.styleOverrides[name] = value;
            continue;
        }

        // Color / icon overrides
        if (COLOR_PROPS.has(name)) {
            fp.colorOverrides[name] = value;
            continue;
        }

        // primaryTextNumberOfLines
        if (name === 'primaryTextNumberOfLines') {
            fp.booleanFlags['primaryTextNumberOfLines'] = value;
            continue;
        }
    }

    // Resolve size
    const activeSizes = Object.entries(sizeFlags)
        .filter(([, v]) => v === 'true')
        .map(([k]) => k);
    const dynamicSizes = Object.entries(sizeFlags)
        .filter(([, v]) => v === 'dynamic')
        .map(([k]) => k);

    if (dynamicSizes.length > 0) {
        fp.size = `dynamic(${[...activeSizes, ...dynamicSizes].join('|')})`;
    } else if (activeSizes.length === 1) {
        fp.size = activeSizes[0];
    } else if (activeSizes.length > 1) {
        fp.size = activeSizes.join('+');
    }
    // else default 'medium' stays

    // Resolve variant
    const activeVariants = Object.entries(variantFlags)
        .filter(([, v]) => v === 'true')
        .map(([k]) => k);
    const dynamicVariants = Object.entries(variantFlags)
        .filter(([, v]) => v === 'dynamic')
        .map(([k]) => k);

    if (dynamicVariants.length > 0) {
        fp.variant = `dynamic(${[...activeVariants, ...dynamicVariants].join('|')})`;
    } else if (activeVariants.length === 1) {
        fp.variant = activeVariants[0];
    } else if (activeVariants.length > 1) {
        fp.variant = activeVariants.join('+');
    }
    // else default stays

    return fp;
}

function fingerprintToKey(fp: VisualFingerprint): string {
    const parts: string[] = [];

    parts.push(`size:${fp.size}`);
    parts.push(`variant:${fp.variant}`);
    parts.push(`text:${fp.hasText}`);
    parts.push(`icon:${fp.hasIcon}`);

    if (fp.hasIconRight) parts.push('iconRight:true');
    if (fp.hasSecondLineText) parts.push('secondLine:true');
    if (fp.hasChildren) parts.push('children:true');
    if (fp.hasIsLoading) parts.push('isLoading:dynamic');
    if (fp.hasIsDisabled) parts.push('isDisabled:dynamic');

    if (fp.shouldUseDefaultHover !== 'true') {
        parts.push(`defaultHover:${fp.shouldUseDefaultHover}`);
    }

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

    return parts.join(' | ');
}

function main() {
    const data: AnalysisData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));

    const groups: Map<string, {fingerprint: VisualFingerprint; usages: Array<{file: string; line: number}>}> = new Map();

    for (const usage of data.detailedUsages) {
        const fp = buildFingerprint(usage);
        const key = fingerprintToKey(fp);

        if (!groups.has(key)) {
            groups.set(key, {fingerprint: fp, usages: []});
        }
        groups.get(key)!.usages.push({file: usage.file, line: usage.line});
    }

    // Sort groups by count descending
    const sorted = [...groups.entries()].sort(([, a], [, b]) => b.usages.length - a.usages.length);

    // Build output
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

    // Print summary
    console.log('=== BUTTON VISUAL GROUPS ===\n');
    console.log(`Total unique visual configurations: ${sorted.length}`);
    console.log(`Total Button usages: ${data.detailedUsages.length}\n`);

    // Print groups with count >= 2
    console.log('=== GROUPS WITH 2+ USAGES ===\n');
    for (const [key, group] of sorted) {
        if (group.usages.length < 2) continue;
        console.log(`[${group.usages.length}x] ${key}`);
        for (const u of group.usages) {
            console.log(`    ${u.file}:${u.line}`);
        }
        console.log();
    }

    // Stats
    const countBuckets: Record<string, number> = {};
    for (const [, group] of sorted) {
        const bucket = group.usages.length === 1 ? '1 (unique)' : group.usages.length <= 3 ? '2-3' : group.usages.length <= 10 ? '4-10' : '10+';
        countBuckets[bucket] = (countBuckets[bucket] || 0) + 1;
    }

    console.log('=== DISTRIBUTION ===\n');
    for (const [bucket, count] of Object.entries(countBuckets).sort()) {
        console.log(`  ${bucket} usages: ${count} groups`);
    }

    // Print singletons summary
    const singletons = sorted.filter(([, g]) => g.usages.length === 1);
    console.log(`\n=== UNIQUE CONFIGURATIONS (1 usage each): ${singletons.length} ===\n`);
    for (const [key, group] of singletons) {
        console.log(`  ${group.usages[0].file}:${group.usages[0].line}`);
        console.log(`    ${key}`);
        console.log();
    }
}

main();
