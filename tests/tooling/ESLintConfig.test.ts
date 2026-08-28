import {describe, expect, it} from 'bun:test';

import {ESLint, Linter} from 'eslint';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('ESLint configuration', () => {
    it('checks the dependencies of useScreenActivityEffect like useEffect', async () => {
        // Given the effective repository config for a hook file and the React Hooks plugin it resolves
        const eslint = new ESLint({cwd: projectRoot});
        const config = await eslint.calculateConfigForFile('src/hooks/useScreenActivityEffect/index.ts');
        const reactHooksPlugin = config?.plugins?.['react-hooks'];
        const settings = config?.settings;

        expect(reactHooksPlugin).toBeDefined();
        expect(settings?.['react-hooks']).toEqual({additionalEffectHooks: '(useScreenActivityEffect)'});

        // When exhaustive-deps checks a call site which omits one reactive value from its dependency list
        const messages = new Linter({configType: 'flat'}).verify(
            `function Probe(value) {
                useScreenActivityEffect(() => console.log(value), []);
            }`,
            [
                {
                    languageOptions: {ecmaVersion: 2022, sourceType: 'module'},
                    plugins: {'react-hooks': reactHooksPlugin},
                    settings,
                    rules: {'react-hooks/exhaustive-deps': 'error'},
                },
            ],
        );

        // Then the custom hook reports the same missing dependency that useEffect would report
        expect(messages).toEqual([
            expect.objectContaining({
                ruleId: 'react-hooks/exhaustive-deps',
                message: expect.stringContaining("missing dependency: 'value'"),
            }),
        ]);
    });
});
