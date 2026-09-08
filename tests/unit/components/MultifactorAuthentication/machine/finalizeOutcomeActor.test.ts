import createActors from '@components/MultifactorAuthentication/machine/mfaActors';
import type {FinalizeOutcomeInput} from '@components/MultifactorAuthentication/machine/types';
import trackMFAFlowOutcome from '@components/MultifactorAuthentication/observability/trackMFAFlowOutcome';
import type {MFARegistrationStateSnapshot} from '@components/MultifactorAuthentication/observability/trackMFAFlowOutcome';

import {createLocalMFAError} from '@libs/MultifactorAuthentication/shared/MFAResult';

import CONST from '@src/CONST';

import {MFA_TEST_AUTH_METHOD, MFA_TEST_SCENARIO_RESPONSE} from 'tests/utils/mfa/flowFixtures';
import {createActor, waitFor} from 'xstate';

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
const CALLBACK_RESPONSE = CONST.MULTIFACTOR_AUTHENTICATION.CALLBACK_RESPONSE;

const mockCaptureRegistrationState = jest.fn<Promise<MFARegistrationStateSnapshot>, [accountID: number, signal?: AbortSignal]>();

// The actor's own decisions (callback resilience, SKIP-vs-SHOW routing, the exact telemetry payload)
// are what this suite pins, so the end-of-flow snapshot read and the telemetry sink are mocked here.
jest.mock('@components/MultifactorAuthentication/biometrics/captureRegistrationState', () => ({
    __esModule: true,
    default: (accountID: number, signal?: AbortSignal) => mockCaptureRegistrationState(accountID, signal),
}));

jest.mock('@components/MultifactorAuthentication/observability/trackMFAFlowOutcome', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const trackMFAFlowOutcomeMock = jest.mocked(trackMFAFlowOutcome);

const ACCOUNT_ID = 12345;
const END_STATE: MFARegistrationStateSnapshot = {hasServerCredentials: true, hasLocalCredentials: true, hasEverAcceptedSoftPrompt: true};
const START_STATE: MFARegistrationStateSnapshot = {hasServerCredentials: false, hasLocalCredentials: false, hasEverAcceptedSoftPrompt: false};

function buildInput(overrides: Partial<FinalizeOutcomeInput> = {}): FinalizeOutcomeInput {
    return {
        isSuccessful: true,
        callback: jest.fn().mockResolvedValue(CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN),
        callbackInput: {httpStatusCode: 200, message: undefined, body: undefined},
        payload: undefined,
        accountID: ACCOUNT_ID,
        scenarioName: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
        scenarioResponse: MFA_TEST_SCENARIO_RESPONSE,
        error: undefined,
        authenticationMethod: MFA_TEST_AUTH_METHOD,
        isRegistrationComplete: false,
        softPromptApproved: false,
        registrationStateAtStart: START_STATE,
        ...overrides,
    };
}

/** Runs the machine's real `finalizeOutcome` actor logic to completion and returns its final snapshot. */
async function runFinalizeOutcomeActor(input: FinalizeOutcomeInput) {
    const {finalizeOutcome} = createActors();
    const actorRef = createActor(finalizeOutcome, {input});
    actorRef.start();
    await waitFor(actorRef, (snapshot) => snapshot.status !== 'active');
    return actorRef.getSnapshot();
}

describe('finalizeOutcome actor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCaptureRegistrationState.mockResolvedValue(END_STATE);
    });

    it('calls the scenario callback with the exact callback input and payload it was given', async () => {
        // The machine computes `callbackInput` from context (see mfaMachine.ts's finalizingOutcome
        // input mapping) - the actor's job is only to forward it and the payload to the callback unchanged.
        const callback = jest.fn().mockResolvedValue(CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN);
        const input = buildInput({
            callback,
            callbackInput: {httpStatusCode: 200, message: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, body: {pin: '1234'}},
            payload: {transactionID: 'txn-1'},
        });

        const snapshot = await runFinalizeOutcomeActor(input);

        expect(callback).toHaveBeenCalledWith(true, {httpStatusCode: 200, message: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, body: {pin: '1234'}}, {transactionID: 'txn-1'});
        expect(snapshot.output).toEqual({callbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN});
    });

    it('returns SKIP_OUTCOME_SCREEN when the callback returns it', async () => {
        const input = buildInput({callback: jest.fn().mockResolvedValue(CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN)});

        const snapshot = await runFinalizeOutcomeActor(input);

        expect(snapshot.output).toEqual({callbackResponse: CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN});
    });

    it('falls back to SHOW_OUTCOME_SCREEN and does not reject when the callback throws', async () => {
        const input = buildInput({callback: jest.fn().mockRejectedValue(new Error('callback exploded'))});

        const snapshot = await runFinalizeOutcomeActor(input);

        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({callbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN});
    });

    it('captures the end-of-flow registration snapshot and reports telemetry exactly once', async () => {
        const input = buildInput({isSuccessful: false, error: createLocalMFAError(REASON.LOCAL_ERRORS.CANCELED, 'user canceled'), isRegistrationComplete: true, softPromptApproved: true});

        await runFinalizeOutcomeActor(input);

        expect(mockCaptureRegistrationState).toHaveBeenCalledWith(ACCOUNT_ID, undefined);
        expect(trackMFAFlowOutcomeMock).toHaveBeenCalledTimes(1);
        expect(trackMFAFlowOutcomeMock).toHaveBeenCalledWith(
            expect.objectContaining({
                isSuccessful: false,
                scenario: CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST,
                isRegistrationComplete: true,
                isAuthorizationComplete: true,
                softPromptApproved: true,
                startState: START_STATE,
                endState: END_STATE,
            }),
        );
    });

    it('falls back to the end-state snapshot when no start-of-flow snapshot was recorded', async () => {
        const input = buildInput({registrationStateAtStart: undefined});

        await runFinalizeOutcomeActor(input);

        expect(trackMFAFlowOutcomeMock).toHaveBeenCalledWith(expect.objectContaining({startState: END_STATE, endState: END_STATE}));
    });

    it('keeps the callback response when the end-of-flow snapshot read rejects', async () => {
        // The callback has already stored its secrets or navigated by the time the telemetry read runs.
        // Rejecting here would drop SKIP_OUTCOME_SCREEN and push an outcome screen over the destination
        // the callback navigated to, so a telemetry failure must not reach the machine's onError.
        mockCaptureRegistrationState.mockRejectedValue(new Error('registration state read exploded'));
        const input = buildInput({callback: jest.fn().mockResolvedValue(CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN)});

        const snapshot = await runFinalizeOutcomeActor(input);

        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({callbackResponse: CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN});
        expect(trackMFAFlowOutcomeMock).not.toHaveBeenCalled();
    });

    it('computes isAuthorizationComplete from whether a scenario response exists', async () => {
        const input = buildInput({scenarioResponse: undefined});

        await runFinalizeOutcomeActor(input);

        expect(trackMFAFlowOutcomeMock).toHaveBeenCalledWith(expect.objectContaining({isAuthorizationComplete: false}));
    });
});
