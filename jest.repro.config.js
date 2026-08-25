/**
 * One-off Jest config for the onboarding resetRoot / history.replaceState repro.
 *
 * The main config uses the `jest-expo` (native) preset, which resolves
 * `@react-navigation/native` to `useLinking.native.js` - the variant that never touches
 * `window.history`. The Safari bug lives in the WEB variant (`useLinking.js`), whose
 * `onStateChange` calls `history.replaceState`. This config swaps in `jest-expo/web` so the
 * real web linking path runs in jsdom.
 *
 * `setupFilesAfterEnv` is dropped on purpose: it loads @testing-library/react-native, which
 * pulls the native RN bridge and blows up under the web preset. This harness renders with
 * react-dom directly instead.
 */
const baseConfig = require('./jest.config');

module.exports = {
    ...baseConfig,
    preset: 'jest-expo/web',
    // Keep the base testMatch so Jest does not consider the repo's snapshot files obsolete and delete
    // them; select this harness with `--testPathPatterns tests/repro` instead.
    testMatch: [...baseConfig.testMatch, '<rootDir>/tests/repro/**/*.test.ts?(x)'],
    setupFiles: [...baseConfig.setupFiles, '<rootDir>/tests/repro/setup.ts'],
    setupFilesAfterEnv: [],
    fakeTimers: {enableGlobally: false},
    // __DEV__ false keeps expo's web entry from booting its Metro HMR client, which needs a real WebSocket.
    globals: {...baseConfig.globals, __DEV__: false},
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        // Bypass the repo's root `__mocks__/react-native.ts`, which touches the native bridge.
        '^react-native$': '<rootDir>/node_modules/react-native-web/dist/index.js',
    },
};
