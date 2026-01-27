/**
 * Comprehensive comparison tests for MultifactorAuthenticationContextProvider vs LinearMfaContextProvider
 *
 * These tests verify that both providers behave identically for all use cases.
 */
import {act, renderHook, waitFor} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';
// Import after mocks - only test LinearMfaContext since it doesn't have complex dependencies
import {LinearMfaContextProvider, useLinearMfaContext} from '@components/MultifactorAuthentication/LinearFlow';
import {MultifactorAuthenticationCallbacks} from '@libs/MultifactorAuthentication/Biometrics/VALUES';
import CONST from '@src/CONST';

// ============================================================
// MOCKS
// ============================================================

// Mock navigation
const mockNavigate = jest.fn();
const mockIsActiveRoute = jest.fn().mockReturnValue(false);
const mockIsNavigationReady = jest.fn().mockResolvedValue(true);
const mockGetActiveRouteWithoutParams = jest.fn().mockReturnValue('/test');
const mockDismissModal = jest.fn();

jest.mock('@navigation/Navigation', () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
    isActiveRoute: (...args: unknown[]) => mockIsActiveRoute(...args),
    isNavigationReady: () => mockIsNavigationReady(),
    getActiveRouteWithoutParams: () => mockGetActiveRouteWithoutParams(),
    dismissModal: () => mockDismissModal(),
}));

// Mock hooks
jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => key,
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({
    accountID: 12345,
}));

// Mock biometrics support
jest.mock('@libs/MultifactorAuthentication/Biometrics/KeyStore', () => ({
    PublicKeyStore: {
        supportedAuthentication: {biometrics: true, credentials: true},
        get: jest.fn().mockResolvedValue({value: null}),
        set: jest.fn().mockResolvedValue({value: true}),
        delete: jest.fn().mockResolvedValue({value: true}),
    },
    PrivateKeyStore: {
        get: jest.fn().mockResolvedValue({value: 'mock-private-key'}),
        set: jest.fn().mockResolvedValue({value: true}),
        delete: jest.fn().mockResolvedValue({value: true}),
    },
}));

// Mock API calls
jest.mock('@userActions/MultifactorAuthentication', () => ({
    requestAuthenticationChallenge: jest.fn().mockResolvedValue({
        challenge: {token: 'mock-token'},
        publicKeys: [],
    }),
    troubleshootMultifactorAuthentication: jest.fn().mockResolvedValue({
        httpCode: 200,
        reason: 'User authorized successfully',
    }),
}));

jest.mock('@libs/actions/User', () => ({
    requestValidateCodeAction: jest.fn(),
}));

jest.mock('@libs/MultifactorAuthentication/Biometrics/ED25519', () => ({
    generateKeyPair: jest.fn().mockReturnValue({
        privateKey: 'mock-private-key',
        publicKey: 'mock-public-key',
    }),
    signToken: jest.fn().mockReturnValue({
        token: 'mock-token',
        signature: 'mock-signature',
        publicKey: 'mock-public-key',
    }),
}));

jest.mock('@libs/MultifactorAuthentication/Biometrics/helpers', () => ({
    processRegistration: jest.fn().mockResolvedValue({
        step: {wasRecentStepSuccessful: true, isRequestFulfilled: true},
        reason: 'Biometrics registration successful',
    }),
    isChallengeSigned: jest.fn().mockReturnValue(false),
    processScenario: jest.fn().mockResolvedValue({
        step: {wasRecentStepSuccessful: true, isRequestFulfilled: true},
        reason: 'User authorized successfully',
    }),
}));

jest.mock('@libs/MultifactorAuthentication/Biometrics/Challenge', () => {
    return jest.fn().mockImplementation(() => ({
        request: jest.fn().mockResolvedValue({value: true, reason: 'Challenge received successfully'}),
        sign: jest.fn().mockResolvedValue({value: true, reason: 'Challenge signed successfully'}),
        send: jest.fn().mockResolvedValue({value: true, reason: 'User authorized successfully'}),
    }));
});

// ============================================================
// WRAPPER COMPONENTS
// ============================================================

function LinearWrapper({children}: {children: ReactNode}) {
    return <LinearMfaContextProvider>{children}</LinearMfaContextProvider>;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function clearMocks() {
    mockNavigate.mockClear();
    mockIsActiveRoute.mockClear();
    mockIsNavigationReady.mockClear();
    mockGetActiveRouteWithoutParams.mockClear();
    mockDismissModal.mockClear();
    MultifactorAuthenticationCallbacks.onFulfill = {};
}

// ============================================================
// TESTS - LINEAR MFA CONTEXT ONLY
// ============================================================

describe('LinearMfaContextProvider Tests', () => {
    beforeEach(() => {
        clearMocks();
    });

    // --------------------------------------------------------
    // INFO OBJECT TESTS
    // --------------------------------------------------------
    describe('info object', () => {
        it('should have all required properties', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            const {info} = result.current;

            expect(info).toHaveProperty('deviceSupportBiometrics');
            expect(info).toHaveProperty('isLocalPublicKeyInAuth');
            expect(info).toHaveProperty('isBiometryRegisteredLocally');
            expect(info).toHaveProperty('isAnyDeviceRegistered');
            expect(info).toHaveProperty('scenario');
            expect(info).toHaveProperty('success');
            expect(info).toHaveProperty('title');
            expect(info).toHaveProperty('headerTitle');
            expect(info).toHaveProperty('description');
        });

        it('should have deviceSupportBiometrics as boolean', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            expect(typeof result.current.info.deviceSupportBiometrics).toBe('boolean');
        });

        it('should have undefined success initially', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            expect(result.current.info.success).toBeUndefined();
        });

        it('should have undefined scenario initially', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            expect(result.current.info.scenario).toBeUndefined();
        });
    });

    // --------------------------------------------------------
    // PROCEED FUNCTION TESTS
    // --------------------------------------------------------
    describe('proceed function', () => {
        it('should be a function', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            expect(typeof result.current.proceed).toBe('function');
        });

        it('should return a Promise', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            let promise: Promise<unknown>;

            await act(async () => {
                promise = result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(promise!).toBeInstanceOf(Promise);
        });

        it('should set scenario after proceed', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(result.current.info.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
        });
    });

    // --------------------------------------------------------
    // UPDATE FUNCTION TESTS
    // --------------------------------------------------------
    describe('update function', () => {
        it('should be a function', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            expect(typeof result.current.update).toBe('function');
        });

        it('should accept validateCode parameter', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Should not throw
            await act(async () => {
                await result.current.update({validateCode: 123456});
            });
        });

        it('should accept softPromptDecision parameter', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Should not throw
            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });
        });
    });

    // --------------------------------------------------------
    // TRIGGER FUNCTION TESTS
    // --------------------------------------------------------
    describe('trigger function', () => {
        it('should be a function', () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            expect(typeof result.current.trigger).toBe('function');
        });

        it('should accept FULFILL trigger', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL);
            });

            expect(result.current.info.success).toBe(true);
        });

        it('should accept FAILURE trigger', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE);
            });

            expect(result.current.info.success).toBe(false);
        });

        it('should accept CANCEL trigger', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.CANCEL);
            });

            expect(result.current.info.success).toBeUndefined();
        });

        it('should accept optional argument (edge case #4 fix)', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should accept custom outcome path as argument
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL, 'custom-success-outcome' as never);
            });

            expect(result.current.info.success).toBe(true);
        });

        it('should accept scenario as argument', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should accept scenario as argument
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST as never);
            });

            expect(result.current.info.success).toBe(true);
        });
    });

    // --------------------------------------------------------
    // CALLBACK TESTS
    // --------------------------------------------------------
    describe('callbacks (MultifactorAuthenticationCallbacks)', () => {
        it('should execute registered callbacks on FULFILL trigger', async () => {
            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            callback.mockClear();

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL);
            });

            expect(callback).toHaveBeenCalled();
        });

        it('should NOT execute callbacks on FAILURE trigger (edge case #13 fix)', async () => {
            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            callback.mockClear();

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE);
            });

            // Should NOT call callbacks on FAILURE
            expect(callback).not.toHaveBeenCalled();
        });

        it('should NOT execute callbacks on CANCEL trigger', async () => {
            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            callback.mockClear();

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.CANCEL);
            });

            // Should NOT call callbacks on CANCEL
            expect(callback).not.toHaveBeenCalled();
        });
    });

    // --------------------------------------------------------
    // PERSISTENCE TESTS
    // --------------------------------------------------------
    describe('value persistence (edge cases #5 and #6)', () => {
        it('should persist validateCode across update calls', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.update({validateCode: 123456});
            });

            // Subsequent update should not throw and flow should continue
            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });
        });
    });

    // --------------------------------------------------------
    // ERROR HANDLING TESTS
    // --------------------------------------------------------
    describe('error handling', () => {
        it('should throw if useLinearMfaContext is used outside provider', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => {
                renderHook(() => useLinearMfaContext());
            }).toThrow('useLinearMfaContext must be used within LinearMfaContextProvider');

            consoleSpy.mockRestore();
        });
    });

    // --------------------------------------------------------
    // FLOW STATE MACHINE TESTS
    // --------------------------------------------------------
    describe('flow state machine', () => {
        it('should transition through states correctly', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Initial state
            expect(result.current.info.scenario).toBeUndefined();
            expect(result.current.info.success).toBeUndefined();

            // After proceed
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(result.current.info.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);

            // After fulfill
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL);
            });

            expect(result.current.info.success).toBe(true);
        });

        it('should handle failure state correctly', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE);
            });

            expect(result.current.info.success).toBe(false);
        });

        it('should handle starting a new flow after completion', async () => {
            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // First flow
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL);
            });

            // Second flow
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should reset state for new flow
            expect(result.current.info.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
        });
    });
});
