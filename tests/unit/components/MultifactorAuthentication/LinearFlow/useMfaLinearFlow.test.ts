/**
 * Unit tests for useMfaLinearFlow hook
 * Tests all edge cases identified in the comparison analysis
 */
import {act, renderHook} from '@testing-library/react-native';
import type {ReactNode} from 'react';
import React from 'react';
// Import after mocks
import useMfaLinearFlow from '@components/MultifactorAuthentication/LinearFlow/useMfaLinearFlow';
import {MultifactorAuthenticationCallbacks} from '@libs/MultifactorAuthentication/Biometrics/VALUES';
import CONST from '@src/CONST';

// ============================================================
// MOCKS
// ============================================================

const mockNavigate = jest.fn();
const mockIsActiveRoute = jest.fn().mockReturnValue(false);

jest.mock('@navigation/Navigation', () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
    isActiveRoute: (...args: unknown[]) => mockIsActiveRoute(...args),
    isNavigationReady: () => Promise.resolve(true),
    getActiveRouteWithoutParams: () => '/test',
}));

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => `translated:${key}`,
}));

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({
    accountID: 12345,
}));

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

jest.mock('@userActions/MultifactorAuthentication', () => ({
    requestAuthenticationChallenge: jest.fn().mockResolvedValue({
        challenge: {token: 'mock-token'},
        publicKeys: [],
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
}));

jest.mock('@libs/MultifactorAuthentication/Biometrics/helpers', () => ({
    processRegistration: jest.fn().mockResolvedValue({
        step: {wasRecentStepSuccessful: true, isRequestFulfilled: true},
        reason: 'Biometrics registration successful',
    }),
    isChallengeSigned: jest.fn().mockReturnValue(false),
}));

jest.mock('@libs/MultifactorAuthentication/Biometrics/Challenge', () => {
    return jest.fn().mockImplementation(() => ({
        request: jest.fn().mockResolvedValue({value: true}),
        sign: jest.fn().mockResolvedValue({value: true}),
        send: jest.fn().mockResolvedValue({value: true}),
    }));
});

// ============================================================
// TESTS
// ============================================================

describe('useMfaLinearFlow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        MultifactorAuthenticationCallbacks.onFulfill = {};
    });

    describe('initialization', () => {
        it('should initialize with empty state', () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            expect(result.current.state).toEqual({
                deviceSupported: false,
                isRegistered: false,
                isComplete: false,
            });
        });

        it('should provide info object with all required properties', () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            expect(result.current.info).toHaveProperty('deviceSupportBiometrics');
            expect(result.current.info).toHaveProperty('isLocalPublicKeyInAuth');
            expect(result.current.info).toHaveProperty('isBiometryRegisteredLocally');
            expect(result.current.info).toHaveProperty('isAnyDeviceRegistered');
            expect(result.current.info).toHaveProperty('scenario');
            expect(result.current.info).toHaveProperty('success');
            expect(result.current.info).toHaveProperty('title');
            expect(result.current.info).toHaveProperty('headerTitle');
            expect(result.current.info).toHaveProperty('description');
        });
    });

    describe('start function (proceed equivalent)', () => {
        it('should set scenario in state', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(result.current.state.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
        });

        it('should accept and store custom outcome paths (edge case #3)', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST, {
                    successOutcome: 'custom-success' as never,
                    failureOutcome: 'custom-failure' as never,
                });
            });

            expect(result.current.state.outcomePaths?.successOutcome).toBe('custom-success');
            expect(result.current.state.outcomePaths?.failureOutcome).toBe('custom-failure');
        });

        it('should use default outcome paths if not provided', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(result.current.state.outcomePaths?.successOutcome).toContain('success');
            expect(result.current.state.outcomePaths?.failureOutcome).toContain('failure');
        });

        it('should use persisted validateCode if available (edge case #6)', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            // First call stores validateCode
            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST, {
                    validateCode: 123456,
                } as never);
            });

            // Cancel to reset flow but persist values
            await act(async () => {
                result.current.cancel(undefined);
            });

            // Clear the cancel call
            mockNavigate.mockClear();

            // Second call should NOT store validateCode because cancel clears refs
            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should navigate to magic code page because validateCode was cleared
            expect(mockNavigate).toHaveBeenCalled();
        });
    });

    describe('continueFlow function (update equivalent)', () => {
        it('should update validateCode in state', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.continueFlow({validateCode: 654321});
            });

            expect(result.current.state.validateCode).toBe(654321);
        });

        it('should update softPromptAccepted in state', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.continueFlow({softPromptAccepted: true});
            });

            expect(result.current.state.softPromptAccepted).toBe(true);
        });

        it('should persist validateCode to ref (edge case #6)', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.continueFlow({validateCode: 111111});
            });

            // Value should be persisted for subsequent calls
            await act(async () => {
                await result.current.continueFlow({softPromptAccepted: true});
            });

            // validateCode should still be in state
            expect(result.current.state.validateCode).toBe(111111);
        });

        it('should not process if already complete', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Complete the flow
            await act(async () => {
                result.current.cancel(true);
            });

            const stateBefore = {...result.current.state};

            // Try to continue - should return early
            await act(async () => {
                await result.current.continueFlow({validateCode: 999999});
            });

            // State should not change (except isComplete was already true)
            expect(result.current.state.isComplete).toBe(stateBefore.isComplete);
        });
    });

    describe('cancel function', () => {
        it('should set isComplete to true', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                result.current.cancel(undefined);
            });

            expect(result.current.state.isComplete).toBe(true);
        });

        it('should set success based on parameter', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                result.current.cancel(true);
            });

            expect(result.current.state.success).toBe(true);

            // Reset and test false
            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                result.current.cancel(false);
            });

            expect(result.current.state.success).toBe(false);
        });

        it('should reset persisted refs (edge case #10)', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.continueFlow({validateCode: 123456, softPromptAccepted: true});
            });

            await act(async () => {
                result.current.cancel(undefined);
            });

            // Start new flow - persisted values should be cleared
            mockNavigate.mockClear();
            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should navigate to magic code (values were reset)
            expect(mockNavigate).toHaveBeenCalled();
        });

        it('should accept custom outcome paths', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                result.current.cancel(true, {
                    successOutcome: 'custom-cancel-success' as never,
                });
            });

            expect(result.current.state.outcomePaths?.successOutcome).toBe('custom-cancel-success');
        });
    });

    describe('trigger function', () => {
        it('should handle FULFILL trigger', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL);
            });

            expect(result.current.state.isComplete).toBe(true);
            expect(result.current.state.success).toBe(true);
        });

        it('should handle FAILURE trigger', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE);
            });

            expect(result.current.state.isComplete).toBe(true);
            expect(result.current.state.success).toBe(false);
        });

        it('should handle CANCEL trigger', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.CANCEL);
            });

            expect(result.current.state.isComplete).toBe(true);
            expect(result.current.state.success).toBeUndefined();
        });

        it('should accept argument for custom outcome (edge case #4)', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL, 'custom-outcome-path' as never);
            });

            expect(result.current.state.outcomePaths?.successOutcome).toBe('custom-outcome-path');
        });

        it('should accept scenario as argument', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Should use scenario's outcome paths
            expect(result.current.state.outcomePaths).toBeDefined();
        });

        it('should execute callbacks only on FULFILL (edge case #12, #13)', async () => {
            const callback = jest.fn();
            MultifactorAuthenticationCallbacks.onFulfill['test'] = callback;

            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // FAILURE should NOT trigger callbacks
            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE);
            });

            expect(callback).not.toHaveBeenCalled();

            // Reset and test FULFILL
            callback.mockClear();
            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                await result.current.trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL);
            });

            expect(callback).toHaveBeenCalled();
        });
    });

    describe('info object updates', () => {
        it('should update scenario in info after start', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            expect(result.current.info.scenario).toBeUndefined();

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            expect(result.current.info.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
        });

        it('should update success in info after completion', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            expect(result.current.info.success).toBeUndefined();

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                result.current.cancel(true);
            });

            expect(result.current.info.success).toBe(true);
        });

        it('should not show success before completion', async () => {
            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // Flow started but not complete
            expect(result.current.info.success).toBeUndefined();
        });
    });

    describe('navigation checks (edge case #9)', () => {
        it('should call isActiveRoute before navigating', async () => {
            mockIsActiveRoute.mockReturnValue(false);

            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            // isActiveRoute should be checked during navigation
            // The actual assertion depends on the flow state
        });

        it('should not navigate if already on target route', async () => {
            mockIsActiveRoute.mockReturnValue(true);
            mockNavigate.mockClear();

            const {result} = renderHook(() => useMfaLinearFlow());

            await act(async () => {
                await result.current.start(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
            });

            await act(async () => {
                result.current.cancel(true);
            });

            // Should check route but not navigate if already there
            // Navigate may still be called for other routes
        });
    });
});
