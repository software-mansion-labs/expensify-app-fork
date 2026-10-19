import {getScenarioConfig} from '@components/MultifactorAuthentication/config';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import snapshotToState from '@components/MultifactorAuthentication/machine/snapshotToState';
import type {
    AuthorizeInput,
    AuthorizeOutput,
    CancelScenarioInput,
    CancelScenarioOutput,
    CreateCredentialInput,
    CreateCredentialOutput,
    ExecuteScenarioActionInput,
    ExecuteScenarioActionOutput,
    FinalizeOutcomeInput,
    FinalizeOutcomeOutput,
    LoadRegistrationStateInput,
    LoadRegistrationStateOutput,
    MfaContext,
    RegisterCredentialInput,
    RegisterCredentialOutput,
    RequestRegistrationChallengeInput,
    RequestRegistrationChallengeOutput,
    ValidateDeviceInput,
} from '@components/MultifactorAuthentication/machine/types';

import Log from '@libs/Log';
import type {MFAResult} from '@libs/MultifactorAuthentication/shared/MFAResult';
import {createLocalMFAError, createMFAErrorFromApiResponse} from '@libs/MultifactorAuthentication/shared/MFAResult';
import type {MultifactorAuthenticationReason} from '@libs/MultifactorAuthentication/shared/types';

import CONST from '@src/CONST';

import type {StateValue} from 'xstate';

import {createActorAtState, createFlowContext, sendExecuteScenarioActionDone, sendRegisterCredentialDone, sendRequestRegistrationChallengeDone} from 'tests/utils/mfa/flowActors';
import createInitEvent, {
    MFA_TEST_AUTH_METHOD,
    MFA_TEST_CANCEL_ERROR,
    MFA_TEST_KEY_INFO,
    MFA_TEST_REGISTRATION_CHALLENGE,
    MFA_TEST_SCENARIO_RESPONSE,
    MFA_TEST_SIGNED_CHALLENGE,
} from 'tests/utils/mfa/flowFixtures';
import {createActorDoneEvent} from 'tests/utils/mfa/flowPaths';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';
import {createActor, fromPromise, matchesState, waitFor} from 'xstate';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

type CancelConfirmState = typeof MFA_STATE.CANCEL_CONFIRM_HIDDEN | typeof MFA_STATE.CANCEL_CONFIRM_VISIBLE;

/** Builds an `open` state value with both regions pinned: the flow step and the dialog. */
function openAt(flow: StateValue, cancelConfirm: CancelConfirmState = MFA_STATE.CANCEL_CONFIRM_HIDDEN): StateValue {
    return {[MFA_STATE.OPEN]: {[MFA_STATE.FLOW]: flow, [MFA_STATE.CANCEL_CONFIRM]: cancelConfirm}};
}

const STEP_STATES: Array<{description: string; flow: StateValue}> = [
    {description: 'validating the device', flow: {[MFA_STATE.PREPARING]: MFA_STATE.VALIDATING_DEVICE}},
    {description: 'deciding registration', flow: {[MFA_STATE.PREPARING]: MFA_STATE.DECIDING_REGISTRATION}},
    {description: 'awaiting the validate code', flow: {[MFA_STATE.VALIDATE_CODE]: {[MFA_STATE.AWAITING_VALIDATE_CODE]: MFA_STATE.AWAITING_INPUT}}},
    {description: 'requesting the registration challenge', flow: {[MFA_STATE.VALIDATE_CODE]: MFA_STATE.REQUESTING_REGISTRATION_CHALLENGE}},
    {description: 'awaiting the soft prompt', flow: {[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}},
    {description: 'registering the credential', flow: {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.REGISTERING_KEY}}},
    {description: 'executing the scenario action', flow: {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.EXECUTING_SCENARIO_ACTION}}},
];

const FINALIZING_OUTCOME = {[MFA_STATE.OUTCOME]: MFA_STATE.FINALIZING_OUTCOME};
const AUTHORIZING = {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING};
const EXECUTING_SCENARIO_ACTION = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.EXECUTING_SCENARIO_ACTION}};
const READY_TO_SIGN = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.READY_TO_SIGN}};
const SIGNING_CHALLENGE = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.SIGNING_CHALLENGE}};
const READY_TO_CREATE = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.READY_TO_CREATE}};
const CREATING_KEY = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.CREATING_KEY}};
const REGISTERING_KEY = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.REGISTERING_KEY}};

/** Never settles, so the invoked actor stays running until the machine stops it. */
const pendingCancelScenario = fromPromise<CancelScenarioOutput, CancelScenarioInput>(() => new Promise(() => {}));

/**
 * Starts a live actor requesting the registration challenge, a step that keeps running behind the dialog,
 * with the dialog up and the given cancel actor. `resolveState` cannot start an invoke, so the actor is
 * restored one step earlier and enters the request live.
 */
function startRunningStepWithDialog(cancelScenario = pendingCancelScenario, contextOverrides: Partial<MfaContext> = {}) {
    let runningStepSignal: AbortSignal | undefined;
    const machine = mfaMachine.provide({
        actors: {
            requestRegistrationChallenge: fromPromise<RequestRegistrationChallengeOutput, RequestRegistrationChallengeInput>(({signal}) => {
                runningStepSignal = signal;
                return new Promise(() => {});
            }),
            cancelScenario,
            finalizeOutcome: fromPromise<FinalizeOutcomeOutput, FinalizeOutcomeInput>(() => new Promise(() => {})),
        },
    });
    const snapshot = machine.resolveState({
        value: openAt({[MFA_STATE.VALIDATE_CODE]: {[MFA_STATE.AWAITING_VALIDATE_CODE]: MFA_STATE.AWAITING_INPUT}}),
        context: createFlowContext(contextOverrides),
    });
    const actor = createActor(machine, {snapshot});
    actor.start();
    actor.send({type: 'VALIDATE_CODE_ENTERED', validateCode: '123456'});
    actor.send({type: 'REQUEST_CANCEL'});
    return {actor, getRunningStepSignal: () => runningStepSignal};
}

// The graph-traversal suites generate their expectations from the machine, so a transition pointed at
// a wrong target adjusts those expectations and still passes. This suite pins the cancel-confirmation
// dialog and the cancel routing by hand.

describe('MFA cancel', () => {
    describe('requesting a cancel', () => {
        it.each(STEP_STATES)('opens the dialog and keeps the flow step while $description', ({flow}) => {
            // Given the flow is mid-step, where a back press should ask before abandoning the authentication
            const actor = createActorAtState(openAt(flow));

            // When the user asks to cancel
            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the dialog opens while the step keeps its place, so dismissing it resumes exactly where the user was
            const result = actor.getSnapshot();
            expect(matchesState(openAt(flow, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(true);

            actor.stop();
        });

        it('is ignored while the outcome is being finalized', () => {
            // Given the outcome is being finalized, so the scenario's callback is running and the result can no longer be taken back
            const actor = createActorAtState(openAt(FINALIZING_OUTCOME));

            // When the user asks to cancel
            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            // Then nothing changes, because a dialog now would ask about a decision that is already made
            expect(matchesState(openAt(FINALIZING_OUTCOME), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it.each([MFA_STATE.SUCCESS, MFA_STATE.FAILURE])('closes the modal from the %s outcome', (outcome) => {
            // Given the flow already shows its final outcome screen, so there is nothing left to cancel
            const actor = createActorAtState(openAt({[MFA_STATE.OUTCOME]: outcome}));

            // When the user presses back or cancel
            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the modal closes without a dialog, because leaving can no longer change the result
            const result = actor.getSnapshot();
            expect(result.matches(MFA_STATE.CLOSING)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });
    });

    describe('while the dialog is visible', () => {
        it('hides the dialog on DISMISS_CANCEL without touching the flow step', () => {
            // Given the dialog is open over the authorizing step
            const flow = {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING};
            const actor = createActorAtState(openAt(flow, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            // When the user chooses to keep going
            actor.start();
            actor.send({type: 'DISMISS_CANCEL'});

            // Then the dialog hides and the flow stays on its step, so the user continues without redoing any work
            expect(matchesState(openAt(flow), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('lets the flow step finish and keeps the dialog up on the next step', () => {
            // Given the dialog is open while the registration challenge request still runs behind it
            const actor = createActorAtState(openAt({[MFA_STATE.VALIDATE_CODE]: MFA_STATE.REQUESTING_REGISTRATION_CHALLENGE}, MFA_STATE.CANCEL_CONFIRM_VISIBLE), {
                validateCode: '123456',
            });

            // When the request finishes before the user answers the dialog
            actor.start();
            sendRequestRegistrationChallengeDone(actor, {success: true, challenge: MFA_TEST_REGISTRATION_CHALLENGE});

            // Then the flow advances but the dialog stays up, because background progress must not dismiss the user's pending decision
            expect(matchesState(openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('holds a registration that finishes behind the dialog before the ceremony, so the scenario action never starts', () => {
            // Given the dialog is open while the backend registration of a new key runs behind it
            const actor = createActorAtState(openAt(REGISTERING_KEY, MFA_STATE.CANCEL_CONFIRM_VISIBLE), {registrationKeyInfo: MFA_TEST_KEY_INFO});

            // When the registration finishes before the user answers
            actor.start();
            sendRegisterCredentialDone(actor, {success: true});

            // Then the flow waits before the signing ceremony, because its platform prompt would cover the dialog and the user may still confirm the cancel
            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).not.toHaveProperty('authorize');

            actor.stop();
        });

        it('ignores a second REQUEST_CANCEL', () => {
            // Given the dialog is already open
            const actor = createActorAtState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            // When another cancel request arrives, e.g. from a repeated back press
            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the dialog stays as is, so repeated presses never stack dialogs or skip the confirmation
            expect(matchesState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        // A restored snapshot never evaluates `always`, so this case has to reach the outcome through a live event.
        // A scenario action already sent can't be held, so it is the step that finishes behind the dialog.
        it('hides the dialog once the flow reaches the outcome', () => {
            // Given the dialog is open while the scenario action, which can't be held back once sent, is in flight
            const actor = createActorAtState(openAt(EXECUTING_SCENARIO_ACTION, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            // When the scenario action finishes before the user answers
            actor.start();
            sendExecuteScenarioActionDone(actor, {success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE});

            // Then the dialog hides, because the outcome is decided and there is nothing left to cancel
            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });
    });

    describe('confirming the cancel', () => {
        it('moves the flow to cancelling and hides the dialog', () => {
            // Given the dialog is open over the authorizing step
            const actor = createActorAtState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            // When the user confirms they want to leave
            actor.start();
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then the flow moves to cancelling and the dialog hides, so the scenario's cancel logic can run and lead to an outcome screen
            const result = actor.getSnapshot();
            expect(matchesState(openAt(MFA_STATE.CANCELLING), result.value)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });

        it('is ignored while the dialog is hidden', () => {
            // Given no dialog is shown
            const actor = createActorAtState(openAt(AUTHORIZING));

            // When a confirm arrives anyway, e.g. a stale tap from a dialog that already closed
            actor.start();
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then it is ignored, because a cancel must always be confirmed through a visible dialog
            expect(matchesState(openAt(AUTHORIZING), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('stops the running step and aborts its signal', () => {
            // Given a step is running with the dialog up
            const {actor, getRunningStepSignal} = startRunningStepWithDialog();
            expect(actor.getSnapshot().children).toHaveProperty('requestRegistrationChallenge');
            expect(getRunningStepSignal()?.aborted).toBe(false);

            // When the user confirms the cancel
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then the step is stopped and its signal aborted, so the in-flight request is dropped and its late result can't move the flow
            expect(actor.getSnapshot().children).not.toHaveProperty('requestRegistrationChallenge');
            expect(getRunningStepSignal()?.aborted).toBe(true);

            actor.stop();
        });

        it('hands the scenario cancel logic and payload to the cancel actor', () => {
            // Given a scenario without its own cancel logic and a running step with the dialog up
            let receivedInput: CancelScenarioInput | undefined;
            const {actor} = startRunningStepWithDialog(
                fromPromise<CancelScenarioOutput, CancelScenarioInput>(({input}) => {
                    receivedInput = input;
                    return new Promise(() => {});
                }),
            );

            // When the user confirms the cancel
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then the cancel actor gets the scenario's cancel inputs and learns the scenario action was never sent, so it can't report an approval
            // BIOMETRICS_TEST defines no `onCancel`, so the actor falls back to the default cancel error.
            expect(receivedInput).toEqual({onCancel: undefined, payload: undefined, isScenarioActionSent: false});

            actor.stop();
        });

        it('hands a scenario-defined onCancel and its payload to the cancel actor', () => {
            // Given the authorize-transaction scenario, which denies the transaction on cancel
            const scenarioName = CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.AUTHORIZE_TRANSACTION;
            const scenario = getScenarioConfig(scenarioName);
            const payload = {transactionID: 'txn-cancel'};
            let receivedInput: CancelScenarioInput | undefined;
            const {actor} = startRunningStepWithDialog(
                fromPromise<CancelScenarioOutput, CancelScenarioInput>(({input}) => {
                    receivedInput = input;
                    return new Promise(() => {});
                }),
                {scenarioName, scenario, payload},
            );

            // When the user confirms the cancel before the scenario action was sent
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then the cancel actor gets that scenario's onCancel and payload, so the right transaction is denied
            expect(receivedInput?.onCancel).toBe(scenario.onCancel);
            expect(receivedInput?.payload).toEqual(payload);
            expect(receivedInput?.isScenarioActionSent).toBe(false);

            actor.stop();
        });

        it('runs the cancel actor once on a double confirm', () => {
            // Given a running step with the dialog up
            let cancelRuns = 0;
            const {actor} = startRunningStepWithDialog(
                fromPromise<CancelScenarioOutput, CancelScenarioInput>(() => {
                    cancelRuns += 1;
                    return new Promise(() => {});
                }),
            );

            // When the confirm arrives twice, e.g. from a double tap
            actor.send({type: 'CONFIRM_CANCEL'});
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then the cancel logic runs once, so a scenario like authorize-transaction never sends two deny requests
            expect(cancelRuns).toBe(1);

            actor.stop();
        });
    });

    describe('while cancelling', () => {
        it('does not reopen the dialog on REQUEST_CANCEL', () => {
            // Given the cancel is already confirmed and its logic is running
            const actor = createActorAtState(openAt(MFA_STATE.CANCELLING));

            // When the user presses back again
            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the dialog stays closed, because the user already decided and the cancel can't be undone
            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('fails the flow with the cancel actor output', () => {
            // Given the cancel logic is running
            const actor = createActorAtState(openAt(MFA_STATE.CANCELLING));

            // When it finishes with its error
            actor.start();
            actor.send(createActorDoneEvent('cancelScenario', MFA_TEST_CANCEL_ERROR));

            // Then the flow finalizes with that error, so the cancel goes through the same outcome path as any other failure
            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(result.context.error).toBe(MFA_TEST_CANCEL_ERROR);

            actor.stop();
        });

        it('fails the flow with an unhandled-exception error when the cancel logic throws', async () => {
            // Given scenario cancel logic that throws
            const {actor} = startRunningStepWithDialog(fromPromise<CancelScenarioOutput, CancelScenarioInput>(() => Promise.reject(new Error('Deny exploded'))));

            // When the user confirms the cancel
            actor.send({type: 'CONFIRM_CANCEL'});
            await waitForBatchedUpdates();

            // Then the flow still reaches an outcome with an unhandled-exception error, so the user isn't stuck in cancelling
            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(result.context.error).toEqual(createLocalMFAError(CONST.MULTIFACTOR_AUTHENTICATION.REASON.LOCAL_ERRORS.UNHANDLED_EXCEPTION, 'Cancel threw: Deny exploded'));

            actor.stop();
        });

        it('moves to closing on CLOSE_MODAL', () => {
            // Given the cancel logic is running
            const actor = createActorAtState(openAt(MFA_STATE.CANCELLING));

            // When the modal is closed, e.g. by navigating away
            actor.start();
            actor.send({type: 'CLOSE_MODAL'});

            // Then the machine closes, because closing the modal always wins over waiting for the cancel
            expect(actor.getSnapshot().matches(MFA_STATE.CLOSING)).toBe(true);

            actor.stop();
        });
    });
    describe('stopping the credential ceremony when the dialog opens', () => {
        /**
         * Starts a live actor that enters credential creation with controllable actors. Each ceremony run settles
         * only when the spec resolves it, and the backend registration records each run and never settles.
         */
        function startCreatingKey() {
            let resolveCreateCredential: (output: CreateCredentialOutput) => void = () => {};
            const createCredentialInputs: Array<{input: CreateCredentialInput; signal: AbortSignal}> = [];
            const registerCredentialInputs: RegisterCredentialInput[] = [];
            const machine = mfaMachine.provide({
                actors: {
                    createCredential: fromPromise<CreateCredentialOutput, CreateCredentialInput>(({input, signal}) => {
                        createCredentialInputs.push({input, signal});
                        return new Promise((resolve) => {
                            resolveCreateCredential = resolve;
                        });
                    }),
                    registerCredential: fromPromise<RegisterCredentialOutput, RegisterCredentialInput>(({input}) => {
                        registerCredentialInputs.push(input);
                        return new Promise(() => {});
                    }),
                    cancelScenario: pendingCancelScenario,
                },
            });
            const snapshot = machine.resolveState({
                value: openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}),
                context: createFlowContext({registrationChallenge: MFA_TEST_REGISTRATION_CHALLENGE}),
            });
            const actor = createActor(machine, {snapshot});
            actor.start();
            actor.send({type: 'SOFT_PROMPT_APPROVED'});
            const finishCreatingKey = async () => {
                resolveCreateCredential({success: true, keyInfo: MFA_TEST_KEY_INFO});
                await waitForBatchedUpdates();
            };
            return {actor, createCredentialInputs, registerCredentialInputs, finishCreatingKey};
        }

        it('registers the key straight away when no dialog is up', async () => {
            // Given the platform ceremony to create a key is running with no dialog up
            const {actor, registerCredentialInputs, finishCreatingKey} = startCreatingKey();

            // When the ceremony returns a new key
            await finishCreatingKey();

            // Then the key is registered with the backend right away, because nothing is waiting on the user
            expect(matchesState(openAt(REGISTERING_KEY), actor.getSnapshot().value)).toBe(true);
            expect(registerCredentialInputs).toEqual([{keyInfo: MFA_TEST_KEY_INFO}]);

            actor.stop();
        });

        it('stops the ceremony and aborts its signal, so the platform prompt never opens over the dialog', () => {
            // Given the platform ceremony to create a key is running
            const {actor, createCredentialInputs} = startCreatingKey();
            expect(createCredentialInputs.at(0)?.signal.aborted).toBe(false);

            // When the user asks to cancel
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the ceremony is stopped, because the platform prompt would cover the dialog and the user couldn't answer it
            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_CREATE, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).not.toHaveProperty('createCredential');
            expect(createCredentialInputs.at(0)?.signal.aborted).toBe(true);

            actor.stop();
        });

        it('drops a ceremony that finishes after the dialog opened and never registers its key', async () => {
            // Given the dialog opened while the key ceremony was running
            const {actor, registerCredentialInputs, finishCreatingKey} = startCreatingKey();
            actor.send({type: 'REQUEST_CANCEL'});

            // When the stopped ceremony still returns a key afterwards
            await finishCreatingKey();

            // Then the key is ignored, so no credential is registered while the user may be about to cancel
            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_CREATE, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.context.registrationKeyInfo).toBeUndefined();
            expect(registerCredentialInputs).toHaveLength(0);

            actor.stop();
        });

        it('restarts the ceremony with the same registration challenge once the dialog is dismissed', async () => {
            // Given the dialog stopped the key ceremony
            const {actor, createCredentialInputs, registerCredentialInputs, finishCreatingKey} = startCreatingKey();
            actor.send({type: 'REQUEST_CANCEL'});

            // When the user dismisses the dialog to continue
            actor.send({type: 'DISMISS_CANCEL'});

            // Then the ceremony restarts with the same challenge, so the user can finish creating the key without requesting a new one
            expect(matchesState(openAt(CREATING_KEY), actor.getSnapshot().value)).toBe(true);
            expect(createCredentialInputs).toHaveLength(2);
            expect(createCredentialInputs.at(1)?.input.registrationChallenge).toBe(MFA_TEST_REGISTRATION_CHALLENGE);
            expect(createCredentialInputs.at(1)?.signal.aborted).toBe(false);

            // When the restarted ceremony returns a key
            await finishCreatingKey();

            // Then the key is registered as usual, so dismissing the dialog leaves the flow working normally
            expect(matchesState(openAt(REGISTERING_KEY), actor.getSnapshot().value)).toBe(true);
            expect(registerCredentialInputs).toEqual([{keyInfo: MFA_TEST_KEY_INFO}]);

            actor.stop();
        });

        it('never restarts the ceremony once the cancel is confirmed', () => {
            // Given the dialog stopped the key ceremony
            const {actor, createCredentialInputs, registerCredentialInputs} = startCreatingKey();
            actor.send({type: 'REQUEST_CANCEL'});

            // When the user confirms the cancel
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then no new ceremony starts, so the platform prompt never appears after the user chose to leave
            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);
            expect(createCredentialInputs).toHaveLength(1);
            expect(registerCredentialInputs).toHaveLength(0);

            actor.stop();
        });

        it('keeps the backend registration running behind the dialog', async () => {
            // Given a key was created and its backend registration is in flight
            const {actor, registerCredentialInputs, finishCreatingKey} = startCreatingKey();
            await finishCreatingKey();

            // When the user asks to cancel
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the registration keeps running, because a sent request can't be taken back and a registered key is harmless if the user cancels
            const result = actor.getSnapshot();
            expect(matchesState(openAt(REGISTERING_KEY, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).toHaveProperty('registerCredential');
            expect(registerCredentialInputs).toHaveLength(1);

            actor.stop();
        });

        it('drops the key info when the flow leaves credential creation', async () => {
            // Given a key was created and stored in the context
            const {actor, finishCreatingKey} = startCreatingKey();
            await finishCreatingKey();
            expect(actor.getSnapshot().context.registrationKeyInfo).toBe(MFA_TEST_KEY_INFO);

            // When the modal closes before the key is registered
            actor.send({type: 'CLOSE_MODAL'});

            // Then the key info is cleared, so a later flow can't register a stale key
            const result = actor.getSnapshot();
            expect(result.matches(MFA_STATE.CLOSING)).toBe(true);
            expect(result.context.registrationKeyInfo).toBeUndefined();

            actor.stop();
        });
    });

    describe('stopping the ceremony when the dialog opens', () => {
        /**
         * Starts a live actor that enters `authorizing` with controllable actors. Each ceremony run settles only
         * when the spec resolves it, and the scenario action records each run and never settles.
         */
        function startSigning() {
            let resolveAuthorize: (output: AuthorizeOutput) => void = () => {};
            const authorizeSignals: AbortSignal[] = [];
            const scenarioActionInputs: ExecuteScenarioActionInput[] = [];
            const context = createFlowContext();
            const machine = mfaMachine.provide({
                actors: {
                    authorize: fromPromise<AuthorizeOutput, AuthorizeInput>(({signal}) => {
                        authorizeSignals.push(signal);
                        return new Promise((resolve) => {
                            resolveAuthorize = resolve;
                        });
                    }),
                    executeScenarioAction: fromPromise<ExecuteScenarioActionOutput, ExecuteScenarioActionInput>(({input}) => {
                        scenarioActionInputs.push(input);
                        return new Promise(() => {});
                    }),
                    cancelScenario: pendingCancelScenario,
                    finalizeOutcome: fromPromise<FinalizeOutcomeOutput, FinalizeOutcomeInput>(() => new Promise(() => {})),
                },
            });
            const actor = createActor(machine, {snapshot: machine.resolveState({value: openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}), context})});
            actor.start();
            actor.send({type: 'SOFT_PROMPT_APPROVED'});
            const finishSigning = async () => {
                resolveAuthorize({success: true, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD});
                await waitForBatchedUpdates();
            };
            return {actor, context, authorizeSignals, scenarioActionInputs, finishSigning};
        }

        it('sends the scenario action straight away when no dialog is up', async () => {
            // Given the signing ceremony is running with no dialog up
            const {actor, scenarioActionInputs, finishSigning} = startSigning();

            // When the ceremony returns a signed challenge
            await finishSigning();

            // Then the scenario action is sent right away, because nothing is waiting on the user
            expect(matchesState(openAt(EXECUTING_SCENARIO_ACTION), actor.getSnapshot().value)).toBe(true);
            expect(scenarioActionInputs).toHaveLength(1);

            actor.stop();
        });

        it('stops the ceremony and aborts its signal, so the platform prompt never opens over the dialog', () => {
            // Given the signing ceremony is running
            const {actor, authorizeSignals} = startSigning();
            expect(authorizeSignals.at(0)?.aborted).toBe(false);

            // When the user asks to cancel
            actor.send({type: 'REQUEST_CANCEL'});

            // Then the ceremony is stopped, because the platform prompt would cover the dialog and the user couldn't answer it
            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).not.toHaveProperty('authorize');
            expect(authorizeSignals.at(0)?.aborted).toBe(true);

            actor.stop();
        });

        it('drops a ceremony that finishes after the dialog opened and never sends the scenario action', async () => {
            // Given the dialog opened while the signing ceremony was running
            const {actor, scenarioActionInputs, finishSigning} = startSigning();
            actor.send({type: 'REQUEST_CANCEL'});

            // When the stopped ceremony still returns a signed challenge
            await finishSigning();

            // Then the challenge is dropped and the scenario action never sent, so e.g. a payment isn't approved while the user may be cancelling
            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.context.signedChallenge).toBeUndefined();
            expect(scenarioActionInputs).toHaveLength(0);

            actor.stop();
        });

        it('restarts the ceremony once the dialog is dismissed and sends the scenario action with its signed challenge', async () => {
            // Given the dialog stopped the signing ceremony
            const {actor, context, authorizeSignals, scenarioActionInputs, finishSigning} = startSigning();
            actor.send({type: 'REQUEST_CANCEL'});

            // When the user dismisses the dialog to continue
            actor.send({type: 'DISMISS_CANCEL'});

            // Then a fresh ceremony starts, so the user gets the platform prompt again
            expect(matchesState(openAt(SIGNING_CHALLENGE), actor.getSnapshot().value)).toBe(true);
            expect(authorizeSignals).toHaveLength(2);
            expect(authorizeSignals.at(1)?.aborted).toBe(false);

            // When the restarted ceremony returns a signed challenge
            await finishSigning();

            // Then the scenario action is sent with that challenge, so dismissing the dialog leaves the flow working normally
            expect(matchesState(openAt(EXECUTING_SCENARIO_ACTION), actor.getSnapshot().value)).toBe(true);
            expect(scenarioActionInputs).toEqual([{runScenarioAction: context.runScenarioAction, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD}]);

            actor.stop();
        });

        it('never restarts the ceremony once the cancel is confirmed', () => {
            // Given the dialog stopped the signing ceremony
            const {actor, authorizeSignals, scenarioActionInputs} = startSigning();
            actor.send({type: 'REQUEST_CANCEL'});

            // When the user confirms the cancel
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then no new ceremony runs and nothing is sent, so e.g. a payment is never approved after the user chose to leave
            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);
            expect(authorizeSignals).toHaveLength(1);
            expect(scenarioActionInputs).toHaveLength(0);

            actor.stop();
        });

        it('drops the signed challenge when the flow leaves authorizing', async () => {
            // Given a signed challenge was stored in the context
            const {actor, finishSigning} = startSigning();
            await finishSigning();
            expect(actor.getSnapshot().context.signedChallenge).toBe(MFA_TEST_SIGNED_CHALLENGE);

            // When the modal closes before the scenario action runs
            actor.send({type: 'CLOSE_MODAL'});

            // Then the signed challenge is cleared, so a later flow can't reuse it
            const result = actor.getSnapshot();
            expect(result.matches(MFA_STATE.CLOSING)).toBe(true);
            expect(result.context.signedChallenge).toBeUndefined();

            actor.stop();
        });
    });

    describe('holding the ceremony', () => {
        /**
         * Starts a live flow for a returning user, optionally opening the dialog during the device check.
         * The preparing steps resolve on their own, so the flow reaches `authorizing` without a user action,
         * the way a credential registration finishing behind the dialog does.
         */
        async function reachAuthorizing({isDialogUp}: {isDialogUp: boolean}) {
            let authorizeRuns = 0;
            const machine = mfaMachine.provide({
                actors: {
                    validateDevice: fromPromise<MFAResult, ValidateDeviceInput>(() => Promise.resolve({success: true})),
                    loadRegistrationState: fromPromise<LoadRegistrationStateOutput, LoadRegistrationStateInput>(() =>
                        Promise.resolve({hasServerCredentials: true, hasLocalCredentials: true, hasEverAcceptedSoftPrompt: true}),
                    ),
                    authorize: fromPromise<AuthorizeOutput, AuthorizeInput>(() => {
                        authorizeRuns += 1;
                        return new Promise(() => {});
                    }),
                    cancelScenario: pendingCancelScenario,
                },
            });
            const actor = createActor(machine);
            actor.start();
            actor.send(createInitEvent());
            if (isDialogUp) {
                actor.send({type: 'REQUEST_CANCEL'});
            }
            await waitFor(actor, (snapshot) => snapshot.matches({[MFA_STATE.OPEN]: {[MFA_STATE.FLOW]: {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING}}}));
            return {actor, getAuthorizeRuns: () => authorizeRuns};
        }

        it('starts the ceremony straight away when no dialog is up', async () => {
            // Given a returning user with no dialog up
            // When the flow reaches the signing step on its own
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: false});

            // Then the ceremony starts right away, because nothing is waiting on the user
            expect(matchesState(openAt(SIGNING_CHALLENGE), actor.getSnapshot().value)).toBe(true);
            expect(getAuthorizeRuns()).toBe(1);

            actor.stop();
        });

        it('holds the ceremony while the dialog is up, so the platform prompt never covers it', async () => {
            // Given a returning user who opened the dialog during the device check
            // When the flow reaches the signing step on its own behind the dialog
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: true});

            // Then the ceremony is held, because the platform prompt would cover the dialog and the user couldn't answer it
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);
            expect(actor.getSnapshot().children).not.toHaveProperty('authorize');
            expect(getAuthorizeRuns()).toBe(0);

            actor.stop();
        });

        it('starts the held ceremony once the dialog is dismissed', async () => {
            // Given the ceremony is held behind the dialog
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: true});

            // When the user dismisses the dialog
            actor.send({type: 'DISMISS_CANCEL'});

            // Then the held ceremony starts, so the flow continues where it paused
            expect(matchesState(openAt(SIGNING_CHALLENGE), actor.getSnapshot().value)).toBe(true);
            expect(getAuthorizeRuns()).toBe(1);

            actor.stop();
        });

        it('never starts the held ceremony once the cancel is confirmed', async () => {
            // Given the ceremony is held behind the dialog
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: true});

            // When the user confirms the cancel
            actor.send({type: 'CONFIRM_CANCEL'});

            // Then the ceremony never starts, so the platform prompt never appears after the user chose to leave
            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);
            expect(getAuthorizeRuns()).toBe(0);

            actor.stop();
        });
    });

    describe('while the scenario action is in flight', () => {
        const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
        const AUTHORIZE_TRANSACTION = CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.AUTHORIZE_TRANSACTION;
        const AWAITING_RESULT = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: {[MFA_STATE.EXECUTING_SCENARIO_ACTION]: MFA_STATE.AWAITING_RESULT}}};
        const DENYING = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: {[MFA_STATE.EXECUTING_SCENARIO_ACTION]: MFA_STATE.DENYING}}};
        const APPROVED: ExecuteScenarioActionOutput = {success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE};
        const DENIED = createMFAErrorFromApiResponse(200, REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, undefined);
        const NETWORK_ERROR = createMFAErrorFromApiResponse(0, REASON.LOCAL_ERRORS.UNHANDLED_API_RESPONSE, undefined);

        function failedApprove(reason: MultifactorAuthenticationReason): ExecuteScenarioActionOutput {
            return {success: false, error: createMFAErrorFromApiResponse(400, reason, undefined)};
        }

        function createDeferred<T>() {
            let resolve: (value: T) => void = () => {};
            let reject: (error: unknown) => void = () => {};
            const promise = new Promise<T>((onResolve, onReject) => {
                resolve = onResolve;
                reject = onReject;
            });
            return {promise, resolve, reject};
        }

        /**
         * Runs the flow live into the scenario action and opens the dialog, so the scenario action and the cancel
         * can settle in any order. A restored snapshot wouldn't start the scenario action actor.
         */
        async function startScenarioActionWithDialog({withOnCancel, contextOverrides = {}}: {withOnCancel: boolean; contextOverrides?: Partial<MfaContext>}) {
            const scenarioAction = createDeferred<ExecuteScenarioActionOutput>();
            const cancel = createDeferred<CancelScenarioOutput>();
            const cancelInputs: CancelScenarioInput[] = [];
            let finalizeRuns = 0;
            const machine = mfaMachine.provide({
                actors: {
                    authorize: fromPromise<AuthorizeOutput, AuthorizeInput>(() =>
                        Promise.resolve({success: true, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD}),
                    ),
                    executeScenarioAction: fromPromise<ExecuteScenarioActionOutput, ExecuteScenarioActionInput>(() => scenarioAction.promise),
                    cancelScenario: fromPromise<CancelScenarioOutput, CancelScenarioInput>(({input}) => {
                        cancelInputs.push(input);
                        return cancel.promise;
                    }),
                    finalizeOutcome: fromPromise<FinalizeOutcomeOutput, FinalizeOutcomeInput>(() => {
                        finalizeRuns += 1;
                        return new Promise(() => {});
                    }),
                },
            });
            const scenarioOverrides = withOnCancel ? {scenarioName: AUTHORIZE_TRANSACTION, scenario: getScenarioConfig(AUTHORIZE_TRANSACTION), payload: {transactionID: 'txn-race'}} : {};
            const context = createFlowContext({...scenarioOverrides, ...contextOverrides});
            const actor = createActor(machine, {snapshot: machine.resolveState({value: openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}), context})});
            actor.start();
            actor.send({type: 'SOFT_PROMPT_APPROVED'});
            await waitForBatchedUpdates();
            actor.send({type: 'REQUEST_CANCEL'});
            return {actor, scenarioAction, cancel, cancelInputs, getFinalizeRuns: () => finalizeRuns};
        }

        /** Confirms the cancel while the approve is in flight, so the deny races it. */
        async function startDenying() {
            const flow = await startScenarioActionWithDialog({withOnCancel: true});
            flow.actor.send({type: 'CONFIRM_CANCEL'});
            return flow;
        }

        async function settle<T>(deferred: ReturnType<typeof createDeferred<T>>, value: T) {
            deferred.resolve(value);
            await waitForBatchedUpdates();
        }

        let logInfoSpy: jest.SpyInstance<void, Parameters<typeof Log.info>>;

        beforeEach(() => {
            logInfoSpy = jest.spyOn(Log, 'info').mockImplementation(() => {});
        });

        afterEach(() => {
            logInfoSpy.mockRestore();
        });

        function getLogData(message: string) {
            return logInfoSpy.mock.calls.filter(([logMessage]) => logMessage === message).map(([, , parameters]) => parameters);
        }

        it('opens the dialog while the request is in flight', async () => {
            // Given the scenario action was sent and is awaiting its result
            // When the user asks to cancel
            const {actor} = await startScenarioActionWithDialog({withOnCancel: true});

            // Then the dialog still opens, so the user can decide whether to send a deny alongside the request already out
            expect(matchesState(openAt(AWAITING_RESULT, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        describe('with a scenario onCancel', () => {
            it('sends the deny on confirm, hides the dialog and keeps the request running', async () => {
                // Given an authorize-transaction approve is in flight with the dialog up
                // When the user confirms the cancel
                const {actor, cancelInputs} = await startDenying();

                // Then the deny is sent while the approve keeps running, because a sent request can't be taken back and the first to settle the outcome decides it
                const result = actor.getSnapshot();
                expect(matchesState(openAt(DENYING), result.value)).toBe(true);
                expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);
                expect(result.context.isCancelConfirmed).toBe(true);
                expect(result.children).toHaveProperty('executeScenarioAction');
                expect(result.children).toHaveProperty('cancelScenario');
                expect(cancelInputs).toHaveLength(1);
                expect(cancelInputs.at(0)?.isScenarioActionSent).toBe(true);

                actor.stop();
            });

            it('ignores REQUEST_CANCEL while denying, so the dialog stays hidden', async () => {
                // Given the deny is racing the approve
                const {actor} = await startDenying();

                // When the user presses back again
                actor.send({type: 'REQUEST_CANCEL'});

                // Then nothing changes, because the cancel is already under way and a dialog would ask an answered question
                expect(matchesState(openAt(DENYING), actor.getSnapshot().value)).toBe(true);

                actor.stop();
            });

            it('sends the deny once on a double confirm', async () => {
                // Given the deny is racing the approve
                const {actor, cancelInputs} = await startDenying();

                // When the confirm arrives again, e.g. from a double tap
                actor.send({type: 'CONFIRM_CANCEL'});

                // Then no second deny goes out, because the backend must get a single answer for the transaction
                expect(matchesState(openAt(DENYING), actor.getSnapshot().value)).toBe(true);
                expect(cancelInputs).toHaveLength(1);

                actor.stop();
            });

            it('ends with the approve when it succeeds while the deny never returns', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction} = await startDenying();

                // When the approve succeeds first
                await settle(scenarioAction, APPROVED);

                // Then the flow ends approved without waiting for the deny, because the server handled the approve first so the payment really went through
                const result = actor.getSnapshot();
                expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
                expect(result.context.error).toBeUndefined();
                expect(result.context.scenarioResponse).toBe(MFA_TEST_SCENARIO_RESPONSE);

                actor.stop();
            });

            it('keeps the approved outcome when the deny returns afterwards', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction, cancel, getFinalizeRuns} = await startDenying();

                // When the approve succeeds and the deny comes back afterwards
                await settle(scenarioAction, APPROVED);
                await settle(cancel, createMFAErrorFromApiResponse(400, REASON.FLOW_OUTCOMES.TRANSACTION_APPROVED, undefined));

                // Then the approved outcome stands and is finalized once, because leaving for the outcome stopped the deny so the result never flips
                const result = actor.getSnapshot();
                expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
                expect(result.context.error).toBeUndefined();
                expect(getFinalizeRuns()).toBe(1);

                actor.stop();
            });

            it('ends with an already-approved approve without waiting for the deny', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction, cancel, getFinalizeRuns} = await startDenying();
                const alreadyApproved = failedApprove(REASON.CLIENT_ERRORS.ALREADY_APPROVED_APPROVE_ATTEMPTED);

                // When the approve fails because the transaction was already approved
                await settle(scenarioAction, alreadyApproved);

                // Then the flow ends right away, because the scenario marks this failure as outcome-confirming: the transaction is approved and a deny can't change that
                expect(matchesState(openAt(FINALIZING_OUTCOME), actor.getSnapshot().value)).toBe(true);
                expect(actor.getSnapshot().context.error?.reason).toBe(REASON.CLIENT_ERRORS.ALREADY_APPROVED_APPROVE_ATTEMPTED);

                // When the deny comes back later with a network error
                await settle(cancel, NETWORK_ERROR);

                // Then the outcome stays the same and is finalized once, so the user never sees the result change
                expect(actor.getSnapshot().context.error?.reason).toBe(REASON.CLIENT_ERRORS.ALREADY_APPROVED_APPROVE_ATTEMPTED);
                expect(getFinalizeRuns()).toBe(1);

                actor.stop();
            });

            it.each([
                ['an already-denied approve', failedApprove(REASON.CLIENT_ERRORS.ALREADY_DENIED_APPROVE_ATTEMPTED)],
                ['REGISTRATION_REQUIRED', failedApprove(REASON.CLIENT_ERRORS.REGISTRATION_REQUIRED)],
                ['a network error', {success: false, error: NETWORK_ERROR} as const],
            ])('ignores %s and lets the deny decide', async (_, approveResult) => {
                // Given the deny is racing the approve
                const {actor, scenarioAction, cancel} = await startDenying();

                // When the approve fails in a way that doesn't confirm an approval
                await settle(scenarioAction, approveResult);

                // Then the flow keeps waiting, because the user confirmed the cancel and only the deny can tell what happened to the transaction
                expect(matchesState(openAt(DENYING), actor.getSnapshot().value)).toBe(true);
                expect(actor.getSnapshot().context.error).toBeUndefined();

                // When the deny comes back
                await settle(cancel, DENIED);

                // Then the deny's result decides the outcome
                expect(matchesState(openAt(FINALIZING_OUTCOME), actor.getSnapshot().value)).toBe(true);
                expect(actor.getSnapshot().context.error).toEqual(DENIED);

                actor.stop();
            });

            it('ignores a rejected approve actor and lets the deny decide', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction, cancel} = await startDenying();

                // When the approve actor rejects unexpectedly
                scenarioAction.reject(new Error('Approve exploded'));
                await waitForBatchedUpdates();

                // Then the flow keeps waiting, because a crashed approve says nothing about the transaction and the deny can still decide
                expect(matchesState(openAt(DENYING), actor.getSnapshot().value)).toBe(true);

                // When the deny comes back
                await settle(cancel, DENIED);

                // Then the deny's result decides the outcome
                expect(actor.getSnapshot().context.error).toEqual(DENIED);

                actor.stop();
            });

            it('ends with the deny when it returns first and drops a later approve', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction, cancel, getFinalizeRuns} = await startDenying();

                // When the deny returns first and the approve settles afterwards
                await settle(cancel, DENIED);
                await settle(scenarioAction, APPROVED);

                // Then the deny's outcome stands and is finalized once, because leaving for the outcome stopped the approve so a late response can't flip the result
                const result = actor.getSnapshot();
                expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
                expect(result.context.error).toEqual(DENIED);
                expect(result.context.scenarioResponse).toBeUndefined();
                expect(getFinalizeRuns()).toBe(1);

                actor.stop();
            });

            // A known trade-off: no success was shown yet, so the deny's error ends the flow instead of waiting on the approve.
            it('ends with the deny network error when it returns before the approve', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction, cancel} = await startDenying();

                // When the deny fails with a network error before the approve succeeds
                await settle(cancel, NETWORK_ERROR);
                await settle(scenarioAction, APPROVED);

                // Then the network error ends the flow, because the deny settled first and nothing had been shown to the user yet
                expect(actor.getSnapshot().context.error).toEqual(NETWORK_ERROR);
                expect(actor.getSnapshot().context.scenarioResponse).toBeUndefined();

                actor.stop();
            });
        });

        describe('without a scenario onCancel', () => {
            it('moves to cancelling and stops the request on confirm', async () => {
                // Given a scenario without onCancel whose scenario action is in flight with the dialog up
                const {actor, cancelInputs} = await startScenarioActionWithDialog({withOnCancel: false});

                // When the user confirms the cancel
                actor.send({type: 'CONFIRM_CANCEL'});

                // Then the request is stopped and the flow cancels, because with no deny to race its result is simply dropped
                const result = actor.getSnapshot();
                expect(matchesState(openAt(MFA_STATE.CANCELLING), result.value)).toBe(true);
                expect(result.children).not.toHaveProperty('executeScenarioAction');
                expect(cancelInputs.at(0)?.isScenarioActionSent).toBe(false);

                actor.stop();
            });

            it.each([
                ['success', APPROVED],
                ['failure', failedApprove(REASON.CLIENT_ERRORS.UNRECOGNIZED)],
            ])('keeps the cancel outcome when the request settles afterwards with a %s', async (_, scenarioResult) => {
                // Given a scenario without onCancel whose scenario action is in flight with the dialog up
                const {actor, scenarioAction, cancel, getFinalizeRuns} = await startScenarioActionWithDialog({withOnCancel: false});

                // When the user confirms and the request settles only after the cancel finished
                actor.send({type: 'CONFIRM_CANCEL'});
                await settle(cancel, MFA_TEST_CANCEL_ERROR);
                await settle(scenarioAction, scenarioResult);

                // Then the cancel outcome stands and is finalized once, because the stopped request's late result must not change what the user sees
                const result = actor.getSnapshot();
                expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
                expect(result.context.error).toBe(MFA_TEST_CANCEL_ERROR);
                expect(result.context.scenarioResponse).toBeUndefined();
                expect(getFinalizeRuns()).toBe(1);

                actor.stop();
            });
        });

        describe('instrumentation', () => {
            const CANCEL_ATTEMPT_LOG = '[MFA] Cancel requested while a scenario request is in flight';
            const PENDING_CANCEL_RESOLVED_LOG = '[MFA] Pending cancel resolved';

            it('numbers every exit attempt from entering the scenario action, including ignored ones while denying', async () => {
                // Given a stale attempt count that entering the scenario action must reset, and a first exit attempt that opened the dialog
                const {actor} = await startScenarioActionWithDialog({withOnCancel: true, contextOverrides: {cancelAttemptsDuringRequest: 7}});

                // When the user dismisses, tries again, confirms, and then presses back while denying
                actor.send({type: 'DISMISS_CANCEL'});
                actor.send({type: 'REQUEST_CANCEL'});
                actor.send({type: 'CONFIRM_CANCEL'});
                actor.send({type: 'REQUEST_CANCEL'});

                // Then every attempt is numbered from the start of the request, including the ignored one, so the logs show how often users try to leave a slow request
                expect(getLogData(CANCEL_ATTEMPT_LOG)).toEqual([
                    {mfa: {scenario: AUTHORIZE_TRANSACTION, state: MFA_STATE.AWAITING_RESULT, attempt: 1}},
                    {mfa: {scenario: AUTHORIZE_TRANSACTION, state: MFA_STATE.AWAITING_RESULT, attempt: 2}},
                    {mfa: {scenario: AUTHORIZE_TRANSACTION, state: MFA_STATE.DENYING, attempt: 3}},
                ]);

                actor.stop();
            });

            it('restarts the count on entering cancelling', () => {
                // Given the dialog is open with a stale attempt count from the request
                const scenario = getScenarioConfig(AUTHORIZE_TRANSACTION);
                const actor = createActorAtState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE), {scenarioName: AUTHORIZE_TRANSACTION, scenario, cancelAttemptsDuringRequest: 4});

                // When the user confirms and then presses back while cancelling
                actor.start();
                actor.send({type: 'CONFIRM_CANCEL'});
                actor.send({type: 'REQUEST_CANCEL'});

                // Then the count starts over in cancelling, so those attempts are not mixed with the ones before the cancel
                expect(getLogData(CANCEL_ATTEMPT_LOG)).toEqual([{mfa: {scenario: AUTHORIZE_TRANSACTION, state: MFA_STATE.CANCELLING, attempt: 1}}]);

                actor.stop();
            });

            it('logs nothing for a scenario without onCancel', async () => {
                // Given a scenario without onCancel whose request is in flight with the dialog up
                const {actor} = await startScenarioActionWithDialog({withOnCancel: false});

                // When the user confirms and presses back again
                actor.send({type: 'CONFIRM_CANCEL'});
                actor.send({type: 'REQUEST_CANCEL'});

                // Then nothing is logged, because these logs track the deny race, which only scenarios with onCancel have
                expect(getLogData(CANCEL_ATTEMPT_LOG)).toEqual([]);

                actor.stop();
            });

            it('reports the approve as resolving the pending cancel', async () => {
                // Given the deny is racing the approve
                const {actor, scenarioAction} = await startDenying();

                // When the approve settles first
                await settle(scenarioAction, APPROVED);

                // Then the log credits the approve, so we can see how often the approve beats the deny
                expect(getLogData(PENDING_CANCEL_RESOLVED_LOG)).toEqual([{mfa: {scenario: AUTHORIZE_TRANSACTION, resolvedBy: 'scenarioAction', reason: undefined}}]);

                actor.stop();
            });

            it('reports the deny as resolving the pending cancel', async () => {
                // Given the deny is racing the approve
                const {actor, cancel} = await startDenying();

                // When the deny settles first
                await settle(cancel, DENIED);

                // Then the log credits the deny with its reason, so we can see how often the cancel wins and what it returned
                expect(getLogData(PENDING_CANCEL_RESOLVED_LOG)).toEqual([{mfa: {scenario: AUTHORIZE_TRANSACTION, resolvedBy: 'onCancel', reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED}}]);

                actor.stop();
            });
        });
    });
});
