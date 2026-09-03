import {describe, expect, it} from 'bun:test';

import {ESLint, Linter} from 'eslint';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

const reactHooksPluginName = 'react-hooks';
const exhaustiveDepsRuleName = `${reactHooksPluginName}/exhaustive-deps`;

type ResolvedConfig = {
    plugins: Record<string, ESLint.Plugin>;
    settings: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// ESLint types calculateConfigForFile as a promise of any, so narrow the two fields this test reads.
function assertResolvesReactHooks(value: unknown): asserts value is ResolvedConfig {
    if (isRecord(value) && isRecord(value.plugins) && isRecord(value.settings) && isRecord(value.plugins[reactHooksPluginName])) {
        return;
    }

    throw new Error(`The resolved config does not expose settings and a ${reactHooksPluginName} plugin`);
}

describe('ESLint configuration', () => {
    it('checks the dependencies of useScreenActivityEffect like useEffect', async () => {
        // Given the effective repository config for a hook file and the React Hooks plugin it resolves
        const eslint = new ESLint({cwd: projectRoot});
        const config: unknown = await eslint.calculateConfigForFile('src/hooks/useScreenActivityEffect/index.ts');
        assertResolvesReactHooks(config);

        const reactHooksPlugin = config.plugins[reactHooksPluginName];
        const settings = config.settings;

        expect(settings[reactHooksPluginName]).toEqual({additionalEffectHooks: '(useScreenActivityEffect)'});

        // When exhaustive-deps checks a call site which omits one reactive value from its dependency list
        const messages = new Linter({configType: 'flat'}).verify(
            `function Probe(value) {
                useScreenActivityEffect(() => console.log(value), []);
            }`,
            [
                {
                    languageOptions: {ecmaVersion: 2022, sourceType: 'module'},
                    plugins: {[reactHooksPluginName]: reactHooksPlugin},
                    settings,
                    rules: {[exhaustiveDepsRuleName]: 'error'},
                },
            ],
        );

        // Then the custom hook reports the same missing dependency that useEffect would report
        expect(messages).toHaveLength(1);
        expect(messages.at(0)?.ruleId).toBe(exhaustiveDepsRuleName);
        expect(messages.at(0)?.message).toContain("missing dependency: 'value'");
    });
});
