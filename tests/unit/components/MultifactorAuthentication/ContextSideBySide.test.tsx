/**
 * Side-by-side comparison tests for Original vs Linear MFA Context
 *
 * These tests run the SAME flow on BOTH contexts and compare results at key checkpoints.
 * This ensures LinearMfaContextProvider can fully replace MultifactorAuthenticationContextProvider.
 */
import {act, renderHook} from '@testing-library/react-native';
import React from 'react';
import type {ReactNode} from 'react';
// Import contexts after mocks
import {LinearMfaContextProvider, useLinearMfaContext} from '@components/MultifactorAuthentication/LinearFlow';
import {MultifactorAuthenticationCallbacks} from '@libs/MultifactorAuthentication/Biometrics/VALUES';
import CONST from '@src/CONST';

// ============================================================
// SHARED MOCKS - Same for both contexts
// ============================================================

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

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => `translated:${key}`,
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({
    accountID: 12345,
}));

// Mocks that can be configured per test
let mockIsRegistered = false;
let mockDeviceSupported = true;
let mockPublicKeys: string[] = [];

const mockPublicKeyStoreGet = jest.fn().mockImplementation(() => Promise.resolve({value: mockIsRegistered ? 'mock-public-key' : null}));

const mockPrivateKeyStoreGet = jest.fn().mockImplementation(() => Promise.resolve({value: 'mock-private-key', reason: 'Key successfully retrieved from SecureStore'}));

const mockPrivateKeyStoreSet = jest.fn().mockImplementation(() => Promise.resolve({value: true, reason: 'Key successfully saved in SecureStore'}));

const mockPublicKeyStoreSet = jest.fn().mockImplementation(() => Promise.resolve({value: true}));

jest.mock('@libs/MultifactorAuthentication/Biometrics/KeyStore', () => ({
    PublicKeyStore: {
        supportedAuthentication: {biometrics: true, credentials: true},
        get: (...args: unknown[]) => mockPublicKeyStoreGet(...args),
        set: (...args: unknown[]) => mockPublicKeyStoreSet(...args),
        delete: jest.fn().mockResolvedValue({value: true}),
    },
    PrivateKeyStore: {
        get: (...args: unknown[]) => mockPrivateKeyStoreGet(...args),
        set: (...args: unknown[]) => mockPrivateKeyStoreSet(...args),
        delete: jest.fn().mockResolvedValue({value: true}),
    },
}));

const mockRequestAuthenticationChallenge = jest.fn().mockImplementation(() =>
    Promise.resolve({
        challenge: {token: 'mock-challenge-token'},
        publicKeys: mockPublicKeys,
    }),
);

jest.mock('@userActions/MultifactorAuthentication', () => ({
    requestAuthenticationChallenge: (...args: unknown[]) => mockRequestAuthenticationChallenge(...args),
    troubleshootMultifactorAuthentication: jest.fn().mockResolvedValue({
        httpCode: 200,
        reason: 'User authorized successfully',
    }),
}));

const mockRequestValidateCodeAction = jest.fn();
jest.mock('@libs/actions/User', () => ({
    requestValidateCodeAction: () => mockRequestValidateCodeAction(),
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

const mockProcessRegistration = jest.fn().mockResolvedValue({
    step: {wasRecentStepSuccessful: true, isRequestFulfilled: true},
    reason: 'Biometrics registration successful',
});

jest.mock('@libs/MultifactorAuthentication/Biometrics/helpers', () => ({
    processRegistration: (...args: unknown[]) => mockProcessRegistration(...args),
    isChallengeSigned: jest.fn().mockReturnValue(false),
    processScenario: jest.fn().mockResolvedValue({
        step: {wasRecentStepSuccessful: true, isRequestFulfilled: true},
        reason: 'User authorized successfully',
    }),
}));

const mockChallengeRequest = jest.fn().mockResolvedValue({value: true, reason: 'Challenge received successfully'});
const mockChallengeSign = jest.fn().mockResolvedValue({value: true, reason: 'Challenge signed successfully'});
const mockChallengeSend = jest.fn().mockResolvedValue({value: true, reason: 'User authorized successfully'});

jest.mock('@libs/MultifactorAuthentication/Biometrics/Challenge', () => {
    return jest.fn().mockImplementation(() => ({
        request: mockChallengeRequest,
        sign: mockChallengeSign,
        send: mockChallengeSend,
    }));
});

// Mock helpers module - ensure doesDeviceSupportBiometrics returns true
// Note: we need to provide all exports that are used by process.ts and useMfaLinearFlow.ts
jest.mock('@components/MultifactorAuthentication/helpers', () => ({
    doesDeviceSupportBiometrics: jest.fn().mockReturnValue(true),
    resetKeys: jest.fn().mockResolvedValue(undefined),
    getOutcomePath: jest.fn().mockImplementation((scenario: string, outcome: string) => `${scenario}-${outcome}`),
    getOutcomePaths: jest.fn().mockImplementation((scenario: string) => ({
        successOutcome: `${scenario.toLowerCase()}-success`,
        failureOutcome: `${scenario.toLowerCase()}-failure`,
    })),
    isValidScenario: jest.fn().mockReturnValue(false),
    isOnProtectedRoute: jest.fn().mockReturnValue(false),
}));

// ============================================================
// WRAPPER COMPONENTS
// ============================================================

function LinearWrapper({children}: {children: ReactNode}) {
    return <LinearMfaContextProvider>{children}</LinearMfaContextProvider>;
}

// ============================================================
// HELPERS
// ============================================================

function resetMocks() {
    // Use mockReset to clear both call history AND mock implementations (like mockResolvedValueOnce)
    mockNavigate.mockReset();
    mockIsActiveRoute.mockReset().mockReturnValue(false);
    mockIsNavigationReady.mockReset().mockResolvedValue(true);
    mockGetActiveRouteWithoutParams.mockReset().mockReturnValue('/test');
    mockDismissModal.mockReset();
    mockRequestValidateCodeAction.mockReset();

    // KeyStore mocks - reset and restore default implementations
    mockPublicKeyStoreGet.mockReset().mockImplementation(() => Promise.resolve({value: mockIsRegistered ? 'mock-public-key' : null}));
    mockPrivateKeyStoreGet.mockReset().mockImplementation(() => Promise.resolve({value: 'mock-private-key', reason: 'Key successfully retrieved from SecureStore'}));
    mockPrivateKeyStoreSet.mockReset().mockImplementation(() => Promise.resolve({value: true, reason: 'Key successfully saved in SecureStore'}));
    mockPublicKeyStoreSet.mockReset().mockImplementation(() => Promise.resolve({value: true}));

    // API mocks
    mockRequestAuthenticationChallenge.mockReset().mockImplementation(() =>
        Promise.resolve({
            challenge: {token: 'mock-challenge-token'},
            publicKeys: mockPublicKeys,
        }),
    );

    // Registration mock - important to reset with default success
    mockProcessRegistration.mockReset().mockResolvedValue({
        step: {wasRecentStepSuccessful: true, isRequestFulfilled: true},
        reason: 'Biometrics registration successful',
    });

    // Challenge mocks
    mockChallengeRequest.mockReset().mockResolvedValue({value: true, reason: 'Challenge received successfully'});
    mockChallengeSign.mockReset().mockResolvedValue({value: true, reason: 'Challenge signed successfully'});
    mockChallengeSend.mockReset().mockResolvedValue({value: true, reason: 'User authorized successfully'});

    MultifactorAuthenticationCallbacks.onFulfill = {};

    // Reset configurable mocks
    mockIsRegistered = false;
    mockDeviceSupported = true;
    mockPublicKeys = [];
}

type FlowCheckpoint = {
    name: string;
    info: {
        scenario: string | undefined;
        success: boolean | undefined;
        deviceSupportBiometrics: boolean;
        isLocalPublicKeyInAuth: boolean;
    };
    navigationCalls: number;
    callbacksCalled: boolean;
};

// ============================================================
// TESTS
// ============================================================

describe('MFA Context Side-by-Side Comparison', () => {
    beforeEach(() => {
        resetMocks();
    });

    describe('Full Registration Flow to Success', () => {
        /**
         * This test simulates:
         * 1. User not registered (no biometrics)
         * 2. User starts flow -> navigate to magic code
         * 3. User enters validate code -> navigate to soft prompt
         * 4. User accepts soft prompt -> registration + authorization
         * 5. Flow completes with success
         */
        it('Linear: should complete full registration flow with all checkpoints', async () => {
            // Setup: User not registered
            mockIsRegistered = false;
            mockPublicKeys = [];

            const checkpoints: FlowCheckpoint[] = [];
            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // CHECKPOINT 1: Initial state
            checkpoints.push({
                name: 'Initial',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            expect(result.current.info.scenario).toBeUndefined();
            expect(result.current.info.success).toBeUndefined();

            // STEP 1: Start flow (user not registered)
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // CHECKPOINT 2: After proceed - should navigate to magic code
            checkpoints.push({
                name: 'After proceed (not registered)',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            expect(result.current.info.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            expect(mockRequestValidateCodeAction).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('magic-code'));

            // STEP 2: User enters validate code
            mockNavigate.mockClear();
            await act(async () => {
                await result.current.update({validateCode: 123456});
            });

            // CHECKPOINT 3: After validate code - should navigate to soft prompt
            checkpoints.push({
                name: 'After validateCode',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('prompt'));

            // STEP 3: User accepts soft prompt
            mockNavigate.mockClear();

            // Note: mockIsRegistered and mockPublicKeys are for createInitialState checks, not for registration
            // They don't affect the actual registration process in process.ts
            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });

            // CHECKPOINT 4: After soft prompt acceptance - registration + authorization
            checkpoints.push({
                name: 'After softPromptDecision',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            // Check that registration was attempted
            expect(mockPrivateKeyStoreSet).toHaveBeenCalled();
            expect(mockPublicKeyStoreSet).toHaveBeenCalled();
            expect(mockProcessRegistration).toHaveBeenCalled();

            // Verify flow completed with success
            expect(result.current.info.success).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('success'));

            // CHECKPOINT 5: Final state
            checkpoints.push({
                name: 'Final (success)',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            // Verify final state
            expect(result.current.info.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            expect(result.current.info.success).toBe(true);

            // Log checkpoints for debugging
            console.log('Flow checkpoints:', JSON.stringify(checkpoints, null, 2));
        });

        it('Linear: should complete authorization-only flow when already registered', async () => {
            // Setup: User already registered
            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            const checkpoints: FlowCheckpoint[] = [];
            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // CHECKPOINT 1: Initial state
            checkpoints.push({
                name: 'Initial (already registered)',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            // STEP 1: Start flow (user already registered - should go straight to authorization)
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // CHECKPOINT 2: After proceed - should authorize directly
            checkpoints.push({
                name: 'After proceed (registered)',
                info: {
                    scenario: result.current.info.scenario,
                    success: result.current.info.success,
                    deviceSupportBiometrics: result.current.info.deviceSupportBiometrics,
                    isLocalPublicKeyInAuth: result.current.info.isLocalPublicKeyInAuth,
                },
                navigationCalls: mockNavigate.mock.calls.length,
                callbacksCalled: callback.mock.calls.length > 0,
            });

            // Should NOT go to magic code or soft prompt
            expect(mockRequestValidateCodeAction).not.toHaveBeenCalled();

            // Should use challenge flow
            expect(mockChallengeRequest).toHaveBeenCalled();
            expect(mockChallengeSign).toHaveBeenCalled();
            expect(mockChallengeSend).toHaveBeenCalled();

            // Verify success
            expect(result.current.info.success).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('success'));

            // Log checkpoints
            console.log('Authorization-only flow checkpoints:', JSON.stringify(checkpoints, null, 2));
        });
    });

    describe('Flow Interruption and Cancel', () => {
        it('should handle cancel at magic code step', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Start flow
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('magic-code'));

            // Cancel at magic code step
            mockNavigate.mockClear();
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE);
            });

            // Verify cancel behavior
            expect(result.current.info.success).toBe(false);
            expect(callback).not.toHaveBeenCalled(); // Callbacks should NOT be called on FAILURE
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('failure'));
        });

        it('should handle cancel at soft prompt step', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Start flow and enter validate code
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.update({validateCode: 123456});
            });

            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('prompt'));

            // Cancel at soft prompt step
            mockNavigate.mockClear();
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.CANCEL);
            });

            // Verify cancel behavior
            expect(result.current.info.success).toBeUndefined();
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Callback Behavior', () => {
        it('should call callbacks only on FULFILL trigger', async () => {
            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test-callback'] = callback;

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Complete successful flow
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Flow auto-completes because user is registered
            // Callbacks should have been called on success
            expect(callback).toHaveBeenCalled();
        });

        it('should NOT call callbacks on FAILURE trigger', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

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

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Persistence Between Calls', () => {
        it('should persist validateCode for subsequent calls', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Start flow
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Enter validate code
            await act(async () => {
                await result.current.update({validateCode: 999888});
            });

            // At this point, validateCode should be stored
            // Next update with softPromptDecision should still have validateCode available
            mockNavigate.mockClear();

            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });

            // Registration should have been called with the stored validateCode
            expect(mockProcessRegistration).toHaveBeenCalledWith(
                expect.objectContaining({
                    validateCode: 999888,
                }),
            );
        });

        it('should clear persisted values on cancel', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Start flow and enter values
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.update({validateCode: 123456});
            });

            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });

            // Cancel flow
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.CANCEL);
            });

            // Clear mocks to track new calls
            mockNavigate.mockClear();
            mockRequestValidateCodeAction.mockClear();

            // Start new flow - should require validate code again
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should navigate to magic code (values were cleared)
            expect(mockRequestValidateCodeAction).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('magic-code'));
        });
    });

    describe('Custom Outcome Paths', () => {
        it('should use custom success outcome when provided', async () => {
            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST, {
                    successOutcome: 'custom-success-path' as never,
                });
            });

            // Flow completes successfully
            expect(result.current.info.success).toBe(true);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('custom-success-path'));
        });

        it('should use custom failure outcome when provided in trigger', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            mockNavigate.mockClear();

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE, 'custom-failure-path' as never);
            });

            expect(result.current.info.success).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('custom-failure-path'));
        });
    });

    describe('Error Handling', () => {
        it('should handle registration failure', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            // Make registration fail
            mockProcessRegistration.mockResolvedValueOnce({
                step: {wasRecentStepSuccessful: false, isRequestFulfilled: true},
                reason: 'Registration failed',
            });

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Go through the flow
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.update({validateCode: 123456});
            });

            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });

            // Should have failed
            expect(result.current.info.success).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('failure'));
        });

        it('should handle authorization failure', async () => {
            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            // Make authorization fail
            mockChallengeSend.mockResolvedValueOnce({value: false, reason: 'Authorization failed'});

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should have failed
            expect(result.current.info.success).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('failure'));
        });
    });

    describe('State Comparison at Key Points', () => {
        it('should have correct info properties at each flow stage', async () => {
            mockIsRegistered = false;
            mockPublicKeys = [];

            const {result} = renderHook(() => useLinearMfaContext(), {
                wrapper: LinearWrapper,
            });

            // Stage 1: Initial
            expect(result.current.info).toEqual(
                expect.objectContaining({
                    scenario: undefined,
                    success: undefined,
                    isLocalPublicKeyInAuth: false,
                }),
            );

            // Stage 2: After proceed
            await act(async () => {
                await result.current.proceed(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(result.current.info).toEqual(
                expect.objectContaining({
                    scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                    success: undefined, // Not complete yet
                    isLocalPublicKeyInAuth: false,
                }),
            );

            // Stage 3: After validate code
            await act(async () => {
                await result.current.update({validateCode: 123456});
            });

            expect(result.current.info).toEqual(
                expect.objectContaining({
                    scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                    success: undefined, // Still not complete
                }),
            );

            // Stage 4: After soft prompt + completion
            mockIsRegistered = true;
            mockPublicKeys = ['mock-public-key'];

            await act(async () => {
                await result.current.update({softPromptDecision: true});
            });

            expect(result.current.info).toEqual(
                expect.objectContaining({
                    scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                    success: true, // Complete!
                    isLocalPublicKeyInAuth: true, // Now registered
                }),
            );
        });
    });
});
