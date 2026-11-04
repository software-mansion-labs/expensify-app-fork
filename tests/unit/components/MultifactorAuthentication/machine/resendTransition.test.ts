import {getScenarioConfig} from '@components/MultifactorAuthentication/config';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import snapshotToState from '@components/MultifactorAuthentication/machine/snapshotToState';
import type {
    AuthorizeInput,
    AuthorizeOutput,
    CancelScenarioInput,
    CancelScenarioOutput,
    ExecuteScenarioActionInput,
    ExecuteScenarioActionOutput,
    FinalizeOutcomeInput,
    FinalizeOutcomeOutput,
    MfaContext,
} from '@components/MultifactorAuthentication/machine/types';

import {createLocalMFAError, createMFAErrorFromApiResponse} from '@libs/MultifactorAuthentication/shared/MFAResult';

import CONST from '@src/CONST';

import type {StateValue} from 'xstate';

import {createFlowContext, openAt} from 'tests/utils/mfa/flowActors';
import {
    MFA_TEST_AUTH_METHOD,
    MFA_TEST_FINALIZE_OUTCOME_SHOW_SCREEN,
    MFA_TEST_SCENARIO_ACTION_LOST_ERROR,
    MFA_TEST_SCENARIO_RESPONSE,
    MFA_TEST_SIGNED_CHALLENGE,
} from 'tests/utils/mfa/flowFixtures';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';
import {createActor, fromPromise, matchesState, SimulatedClock} from 'xstate';

jest.mock('@components/MultifactorAuthentication/observability/breadcrumbs', () => ({__esModule: true, default: jest.fn()}));

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;
const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
const HIDDEN = MFA_STATE.CANCEL_CONFIRM_HIDDEN;
const OFFLINE = MFA_STATE.OFFLINE;

const AWAITING_RESULT = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: {[MFA_STATE.EXECUTING_SCENARIO_ACTION]: MFA_STATE.AWAITING_RESULT}}};
const RESEND_PENDING = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.RESEND_PENDING}};
const DECISION_UNCONFIRMED = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.DECISION_UNCONFIRMED}};
const CANCELLING_IN_FLIGHT = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: {[MFA_STATE.EXECUTING_SCENARIO_ACTION]: MFA_STATE.CANCELLING_IN_FLIGHT}}};

const REQUEST_TIMEOUT_MS = CONST.MULTIFACTOR_AUTHENTICATION.REQUEST_TIMEOUT_MS;
const RESEND_REASON = CONST.MULTIFACTOR_AUTHENTICATION.RESEND_REASON;

const LOST: ExecuteScenarioActionOutput = {success: false, error: MFA_TEST_SCENARIO_ACTION_LOST_ERROR};
const SUCCEEDED: ExecuteScenarioActionOutput = {success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE};
const AUTHENTICATION_REQUIRED: ExecuteScenarioActionOutput = {
    success: false,
    error: createMFAErrorFromApiResponse(401, REASON.CLIENT_ERRORS.AUTHENTICATION_REQUIRED, '401 Authentication required'),
};

type Resolve<T> = (value: T) => void;

/**
 * Runs the flow live from the soft prompt into the scenario action, so each scenario action request (the first one,
 * a re-send, a retry) is a real invocation the test settles in order. A restored snapshot wouldn't invoke it.
 */
async function startScenarioAction(contextOverrides: Partial<MfaContext> = {}) {
    const scenarioActionCalls: Array<{input: ExecuteScenarioActionInput; resolve: Resolve<ExecuteScenarioActionOutput>}> = [];
    const cancelCalls: Array<Resolve<CancelScenarioOutput>> = [];
    const finalizeInputs: FinalizeOutcomeInput[] = [];
    let authorizeRuns = 0;
    const machine = mfaMachine.provide({
        actors: {
            authorize: fromPromise<AuthorizeOutput, AuthorizeInput>(() => {
                authorizeRuns += 1;
                return Promise.resolve({success: true, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD});
            }),
            executeScenarioAction: fromPromise<ExecuteScenarioActionOutput, ExecuteScenarioActionInput>(
                ({input}) =>
                    new Promise((resolve) => {
                        scenarioActionCalls.push({input, resolve});
                    }),
            ),
            cancelScenario: fromPromise<CancelScenarioOutput, CancelScenarioInput>(
                () =>
                    new Promise((resolve) => {
                        cancelCalls.push(resolve);
                    }),
            ),
            finalizeOutcome: fromPromise<FinalizeOutcomeOutput, FinalizeOutcomeInput>(({input}) => {
                finalizeInputs.push(input);
                return Promise.resolve(MFA_TEST_FINALIZE_OUTCOME_SHOW_SCREEN);
            }),
        },
    });
    const context = createFlowContext(contextOverrides);
    const clock = new SimulatedClock();
    const actor = createActor(machine, {snapshot: machine.resolveState({value: openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}), context}), clock});
    actor.start();
    actor.send({type: 'SOFT_PROMPT_APPROVED'});
    await waitForBatchedUpdates();

    /** Settles the latest scenario action request. */
    const settleScenarioAction = async (output: ExecuteScenarioActionOutput) => {
        scenarioActionCalls.at(-1)?.resolve(output);
        await waitForBatchedUpdates();
    };
    const settleCancel = async (output: CancelScenarioOutput) => {
        cancelCalls.at(-1)?.(output);
        await waitForBatchedUpdates();
    };
    const isAt = (flow: StateValue, cancelConfirm: typeof HIDDEN | typeof MFA_STATE.CANCEL_CONFIRM_VISIBLE = HIDDEN, network: typeof MFA_STATE.ONLINE | typeof OFFLINE = MFA_STATE.ONLINE) =>
        matchesState(openAt(flow, cancelConfirm, network), actor.getSnapshot().value);

    return {actor, clock, scenarioActionCalls, finalizeInputs, settleScenarioAction, settleCancel, isAt, getAuthorizeRuns: () => authorizeRuns};
}

function getSetPINOrderCardContext(): Partial<MfaContext> {
    const scenarioName = CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.SET_PIN_ORDER_CARD;
    return {scenarioName, scenario: getScenarioConfig(scenarioName)};
}

describe('MFA resend of a scenario action whose answer was lost', () => {
    it('re-sends the same signed request once and lands on its outcome', async () => {
        // Given the scenario action is out
        const {actor, scenarioActionCalls, settleScenarioAction, isAt} = await startScenarioAction();

        // When its answer is lost
        await settleScenarioAction(LOST);

        // Then the same signed request goes out again without a new prompt, and the screen says it is trying again
        expect(isAt(AWAITING_RESULT)).toBe(true);
        expect(scenarioActionCalls).toHaveLength(2);
        expect(scenarioActionCalls.at(1)?.input.signedChallenge).toBe(MFA_TEST_SIGNED_CHALLENGE);
        expect(actor.getSnapshot().context.resendAttempts).toBe(1);
        expect(snapshotToState(actor.getSnapshot()).isResending).toBe(true);

        // When the re-sent request succeeds
        await settleScenarioAction(SUCCEEDED);

        // Then the flow succeeds as if nothing happened
        expect(isAt({[MFA_STATE.OUTCOME]: MFA_STATE.SUCCESS})).toBe(true);
        expect(actor.getSnapshot().context.scenarioResponse).toBe(MFA_TEST_SCENARIO_RESPONSE);

        actor.stop();
    });

    it.each([
        {description: 'its answer is lost too', output: LOST},
        {description: 'the server already used the challenge', output: AUTHENTICATION_REQUIRED},
    ])("can't confirm the result when the re-sent request fails because $description", async ({output}) => {
        // Given a lost answer was re-sent
        const {actor, settleScenarioAction, isAt} = await startScenarioAction();
        await settleScenarioAction(LOST);

        // When the re-sent request fails this way
        await settleScenarioAction(output);

        // Then the app says it can't confirm the result, and the idempotent test scenario offers trying again
        expect(isAt(DECISION_UNCONFIRMED)).toBe(true);
        const state = snapshotToState(actor.getSnapshot());
        expect(state.isDecisionUnconfirmed).toBe(true);
        expect(state.canRetryUnconfirmed).toBe(true);
        expect(state.error).toBeUndefined();

        actor.stop();
    });

    it.each([
        {description: 'the challenge is unknown on the first request', output: AUTHENTICATION_REQUIRED},
        {description: 'the server answers with an error', output: {success: false, error: createMFAErrorFromApiResponse(500, REASON.SERVER_ERRORS.UNRECOGNIZED)} as const},
    ])('fails without re-sending when $description', async ({output}) => {
        // Given the scenario action is out
        const {actor, scenarioActionCalls, settleScenarioAction, isAt} = await startScenarioAction();

        // When the server answers it with an error
        await settleScenarioAction(output);

        // Then nothing is re-sent, because an answer isn't lost
        expect(isAt({[MFA_STATE.OUTCOME]: MFA_STATE.FAILURE})).toBe(true);
        expect(scenarioActionCalls).toHaveLength(1);
        expect(actor.getSnapshot().context.error).toBe(output.success ? undefined : output.error);

        actor.stop();
    });

    it('holds the re-send offline and sends it once back online', async () => {
        // Given the scenario action is out and the device goes offline
        const {actor, scenarioActionCalls, settleScenarioAction, isAt} = await startScenarioAction();
        actor.send({type: 'NETWORK_OFFLINE'});

        // When its answer is lost
        await settleScenarioAction(LOST);

        // Then the re-send waits for the network behind the offline view
        expect(isAt(RESEND_PENDING, HIDDEN, OFFLINE)).toBe(true);
        expect(snapshotToState(actor.getSnapshot()).isWaitingForNetwork).toBe(true);
        expect(scenarioActionCalls).toHaveLength(1);

        // When the device is back online
        actor.send({type: 'NETWORK_ONLINE'});

        // Then the same signed request goes out
        expect(isAt(AWAITING_RESULT)).toBe(true);
        expect(scenarioActionCalls).toHaveLength(2);

        actor.stop();
    });

    describe('when the scenario action hangs', () => {
        it('keeps waiting until the timeout', async () => {
            // Given the scenario action is out
            const {actor, clock, scenarioActionCalls, isAt} = await startScenarioAction();

            // When its answer takes almost as long as the timeout
            clock.increment(REQUEST_TIMEOUT_MS - 1);

            // Then the flow keeps waiting for it
            expect(isAt(AWAITING_RESULT)).toBe(true);
            expect(scenarioActionCalls).toHaveLength(1);

            actor.stop();
        });

        it('re-sends it as lost once the timeout passes and ignores the late answer', async () => {
            // Given the scenario action is out
            const {actor, clock, scenarioActionCalls, isAt} = await startScenarioAction();

            // When no answer comes in time
            clock.increment(REQUEST_TIMEOUT_MS);
            await waitForBatchedUpdates();

            // Then the same signed request goes out again, and the re-send records why
            expect(isAt(AWAITING_RESULT)).toBe(true);
            expect(scenarioActionCalls).toHaveLength(2);
            expect(scenarioActionCalls.at(1)?.input.signedChallenge).toBe(MFA_TEST_SIGNED_CHALLENGE);
            expect(actor.getSnapshot().context.resendReasons).toEqual([RESEND_REASON.TIMEOUT]);
            expect(snapshotToState(actor.getSnapshot()).isResending).toBe(true);

            // When the first request answers late
            scenarioActionCalls.at(0)?.resolve(SUCCEEDED);
            await waitForBatchedUpdates();

            // Then the flow keeps waiting for the re-sent one, since leaving stopped the first
            expect(isAt(AWAITING_RESULT)).toBe(true);

            actor.stop();
        });

        it("can't confirm the result when the re-sent request hangs too", async () => {
            // Given a hung request was re-sent
            const {actor, clock, isAt} = await startScenarioAction();
            clock.increment(REQUEST_TIMEOUT_MS);
            await waitForBatchedUpdates();

            // When the re-sent one hangs as well
            clock.increment(REQUEST_TIMEOUT_MS);

            // Then the app says it can't confirm the result
            expect(isAt(DECISION_UNCONFIRMED)).toBe(true);

            actor.stop();
        });

        it('leaves a confirmed cancel to its own timeout', async () => {
            // Given the user confirmed a cancel while the scenario action was out
            const {actor, clock, scenarioActionCalls, isAt} = await startScenarioAction();
            actor.send({type: 'REQUEST_CANCEL'});
            actor.send({type: 'CONFIRM_CANCEL'});

            // When the request timeout passes
            clock.increment(REQUEST_TIMEOUT_MS);

            // Then nothing is re-sent, since the user asked to cancel
            expect(isAt(CANCELLING_IN_FLIGHT)).toBe(true);
            expect(scenarioActionCalls).toHaveLength(1);

            actor.stop();
        });
    });

    it('reports every automatic and user retry with the outcome', async () => {
        // Given a lost answer, a lost re-send and a user retry whose request hangs once
        const {actor, clock, finalizeInputs, settleScenarioAction} = await startScenarioAction();
        await settleScenarioAction(LOST);
        await settleScenarioAction(LOST);
        actor.send({type: 'RETRY_WITH_NEW_CHALLENGE'});
        await waitForBatchedUpdates();
        clock.increment(REQUEST_TIMEOUT_MS);
        await waitForBatchedUpdates();

        // When the last re-send succeeds
        await settleScenarioAction(SUCCEEDED);

        // Then the outcome carries each re-send with its reason and the user's retry
        expect(finalizeInputs.at(0)).toEqual(
            expect.objectContaining({
                challengeRetries: 0,
                resendReasons: [RESEND_REASON.NO_RESPONSE, RESEND_REASON.TIMEOUT],
                userRetries: 1,
            }),
        );

        actor.stop();
    });

    describe('back', () => {
        it('is ignored while the re-sent request runs, since it cannot be taken back', async () => {
            // Given a lost answer is being re-sent
            const {actor, settleScenarioAction, isAt} = await startScenarioAction();
            await settleScenarioAction(LOST);

            // When the user presses back
            actor.send({type: 'REQUEST_CANCEL'});

            // Then no dialog opens
            expect(isAt(AWAITING_RESULT)).toBe(true);

            actor.stop();
        });

        it.each([
            {description: 'waits offline to re-send it', goOffline: true},
            {description: "can't confirm the result", goOffline: false},
        ])('closes the modal as unconfirmed without asking when the flow $description', async ({goOffline}) => {
            // Given the flow stopped at a lost answer
            const {actor, finalizeInputs, settleScenarioAction} = await startScenarioAction();
            if (goOffline) {
                actor.send({type: 'NETWORK_OFFLINE'});
                await settleScenarioAction(LOST);
            } else {
                await settleScenarioAction(LOST);
                await settleScenarioAction(LOST);
            }

            // When the user presses back or Close
            actor.send({type: 'REQUEST_CANCEL'});
            await waitForBatchedUpdates();

            // Then the flow ends as unconfirmed and the modal closes without an outcome screen
            expect(actor.getSnapshot().matches(MFA_STATE.CLOSING)).toBe(true);
            expect(finalizeInputs.at(0)?.error?.reason).toBe(REASON.LOCAL_ERRORS.UNCONFIRMED);

            actor.stop();
        });
    });

    describe('trying again', () => {
        it('signs a fresh challenge and runs the action again, with its own re-send', async () => {
            // Given the app couldn't confirm the result
            const {actor, scenarioActionCalls, settleScenarioAction, isAt, getAuthorizeRuns} = await startScenarioAction();
            await settleScenarioAction(LOST);
            await settleScenarioAction(LOST);

            // When the user tries again
            actor.send({type: 'RETRY_WITH_NEW_CHALLENGE'});
            await waitForBatchedUpdates();

            // Then a fresh challenge is signed and the action goes out again
            expect(getAuthorizeRuns()).toBe(2);
            expect(isAt(AWAITING_RESULT)).toBe(true);
            expect(scenarioActionCalls).toHaveLength(3);
            expect(actor.getSnapshot().context.resendAttempts).toBe(0);

            // When this answer is lost as well
            await settleScenarioAction(LOST);

            // Then it is re-sent once, like the first request
            expect(scenarioActionCalls).toHaveLength(4);

            actor.stop();
        });

        it('is not offered for a scenario whose action is not idempotent', async () => {
            // Given the card order couldn't be confirmed
            const {actor, settleScenarioAction, isAt, getAuthorizeRuns} = await startScenarioAction(getSetPINOrderCardContext());
            await settleScenarioAction(LOST);
            await settleScenarioAction(LOST);
            expect(snapshotToState(actor.getSnapshot()).canRetryUnconfirmed).toBe(false);

            // When something asks to try again
            actor.send({type: 'RETRY_WITH_NEW_CHALLENGE'});
            await waitForBatchedUpdates();

            // Then nothing is sent, because a second order could ship a second card
            expect(isAt(DECISION_UNCONFIRMED)).toBe(true);
            expect(getAuthorizeRuns()).toBe(1);

            actor.stop();
        });
    });

    describe('with a confirmed cancel in flight', () => {
        it("doesn't re-send a lost answer and can't confirm the result", async () => {
            // Given the user confirmed a cancel while the scenario action was out
            const {actor, scenarioActionCalls, settleScenarioAction, settleCancel, isAt} = await startScenarioAction();
            actor.send({type: 'REQUEST_CANCEL'});
            actor.send({type: 'CONFIRM_CANCEL'});

            // When the cancel ends and the scenario action's answer is lost
            await settleCancel(createLocalMFAError(REASON.LOCAL_ERRORS.CANCELED, 'canceled'));
            await settleScenarioAction(LOST);

            // Then nothing is re-sent, and trying again isn't offered because the user asked to cancel
            expect(isAt(DECISION_UNCONFIRMED)).toBe(true);
            expect(scenarioActionCalls).toHaveLength(1);
            expect(snapshotToState(actor.getSnapshot()).canRetryUnconfirmed).toBe(false);

            actor.stop();
        });

        it('lands on the outcome when the cancel got an answer', async () => {
            // Given the user confirmed a cancel while the scenario action was out
            const {actor, settleScenarioAction, settleCancel, isAt} = await startScenarioAction();
            actor.send({type: 'REQUEST_CANCEL'});
            actor.send({type: 'CONFIRM_CANCEL'});

            // When the scenario action's answer is lost but the cancel's arrives
            const answeredCancel = createMFAErrorFromApiResponse(200, REASON.FLOW_OUTCOMES.TRANSACTION_DENIED);
            await settleScenarioAction(LOST);
            await settleCancel(answeredCancel);

            // Then the cancel's answer decides, as before
            expect(isAt({[MFA_STATE.OUTCOME]: MFA_STATE.FAILURE})).toBe(true);
            expect(actor.getSnapshot().context.error).toBe(answeredCancel);

            actor.stop();
        });
    });
});
