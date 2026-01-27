/**
 * Unit tests for LinearFlow process function
 */
// Import after mocks
import {createInitialState, process} from '@components/MultifactorAuthentication/LinearFlow/process';
import type {MfaState} from '@components/MultifactorAuthentication/LinearFlow/types';
import CONST from '@src/CONST';

// ============================================================
// MOCKS
// ============================================================

const mockNavigate = jest.fn();
const mockIsActiveRoute = jest.fn().mockReturnValue(false);
const mockRequestValidateCodeAction = jest.fn();

jest.mock('@navigation/Navigation', () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
    isActiveRoute: (...args: unknown[]) => mockIsActiveRoute(...args),
}));

jest.mock('@libs/actions/User', () => ({
    requestValidateCodeAction: () => mockRequestValidateCodeAction(),
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

jest.mock('@libs/MultifactorAuthentication/Biometrics/ED25519', () => ({
    generateKeyPair: jest.fn().mockReturnValue({
        privateKey: 'mock-private-key',
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
}));

const mockChallengeRequest = jest.fn().mockResolvedValue({value: true});
const mockChallengeSign = jest.fn().mockResolvedValue({value: true});
const mockChallengeSend = jest.fn().mockResolvedValue({value: true});

jest.mock('@libs/MultifactorAuthentication/Biometrics/Challenge', () => {
    return jest.fn().mockImplementation(() => ({
        request: mockChallengeRequest,
        sign: mockChallengeSign,
        send: mockChallengeSend,
    }));
});

// ============================================================
// TESTS
// ============================================================

describe('LinearFlow process function', () => {
    const mockAccountID = 12345;
    const mockTranslate = (key: string) => `translated:${key}`;
    let setState: jest.Mock;
    let stateUpdates: Partial<MfaState>[];

    beforeEach(() => {
        jest.clearAllMocks();
        mockNavigate.mockClear();
        mockIsActiveRoute.mockClear();
        mockRequestValidateCodeAction.mockClear();

        stateUpdates = [];
        setState = jest.fn((updates: Partial<MfaState>) => {
            stateUpdates.push(updates);
        });
    });

    describe('early exits', () => {
        it('should return early if no scenario', async () => {
            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: undefined,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(setState).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('should navigate to failure if error in state', async () => {
            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                error: {reason: 'TEST_ERROR'},
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(mockNavigate).toHaveBeenCalled();
            expect(setState).toHaveBeenCalledWith(
                expect.objectContaining({
                    isComplete: true,
                    success: false,
                }),
            );
        });
    });

    describe('device support check', () => {
        it('should navigate to no-eligible-methods if device not supported', async () => {
            const state: MfaState = {
                deviceSupported: false,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('no-eligible-methods'));
            expect(setState).toHaveBeenCalledWith(
                expect.objectContaining({
                    isComplete: true,
                    success: false,
                    error: {reason: 'NO_ELIGIBLE_METHODS'},
                }),
            );
        });
    });

    describe('registration flow (not registered)', () => {
        it('should request validate code if missing', async () => {
            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                validateCode: undefined,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(mockRequestValidateCodeAction).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalled();
            // Should not set complete yet
            expect(setState).not.toHaveBeenCalledWith(expect.objectContaining({isComplete: true}));
        });

        it('should navigate to soft prompt if validateCode present but softPromptAccepted undefined', async () => {
            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                validateCode: 123456,
                softPromptAccepted: undefined,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('prompt'));
        });

        it('should navigate to failure if user declined soft prompt', async () => {
            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                validateCode: 123456,
                softPromptAccepted: false,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('failure'));
            expect(setState).toHaveBeenCalledWith(
                expect.objectContaining({
                    isComplete: true,
                    success: false,
                    error: {reason: 'USER_DECLINED'},
                }),
            );
        });
    });

    describe('navigation helpers', () => {
        it('should check isActiveRoute before navigating', async () => {
            mockIsActiveRoute.mockReturnValue(false);

            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                validateCode: undefined,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            expect(mockIsActiveRoute).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalled();
        });

        it('should NOT navigate if already on target route', async () => {
            mockIsActiveRoute.mockReturnValue(true);

            const state: MfaState = {
                deviceSupported: true,
                isRegistered: false,
                isComplete: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                validateCode: undefined,
            };

            await process(state, mockAccountID, mockTranslate, setState);

            // Navigate should not be called because isActiveRoute returns true
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});

describe('createInitialState function', () => {
    const mockAccountID = 12345;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create state with scenario', async () => {
        const state = await createInitialState(mockAccountID, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);

        expect(state.scenario).toBe(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);
    });

    it('should check device support', async () => {
        const state = await createInitialState(mockAccountID, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);

        expect(typeof state.deviceSupported).toBe('boolean');
    });

    it('should initialize with isComplete false', async () => {
        const state = await createInitialState(mockAccountID, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);

        expect(state.isComplete).toBe(false);
    });

    it('should initialize with undefined values', async () => {
        const state = await createInitialState(mockAccountID, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST);

        expect(state.validateCode).toBeUndefined();
        expect(state.softPromptAccepted).toBeUndefined();
        expect(state.success).toBeUndefined();
        expect(state.error).toBeUndefined();
    });

    it('should store params if provided', async () => {
        const params = {customParam: 'value'};
        const state = await createInitialState(mockAccountID, CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST, params);

        expect(state.params).toEqual(params);
    });
});
