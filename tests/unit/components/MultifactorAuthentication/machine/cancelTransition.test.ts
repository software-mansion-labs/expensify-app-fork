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

import type {MFAResult} from '@libs/MultifactorAuthentication/shared/MFAResult';
import {createLocalMFAError} from '@libs/MultifactorAuthentication/shared/MFAResult';

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
            const actor = createActorAtState(openAt(flow));

            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(flow, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(true);

            actor.stop();
        });

        it('is ignored while the outcome is being finalized', () => {
            const actor = createActorAtState(openAt(FINALIZING_OUTCOME));

            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            expect(matchesState(openAt(FINALIZING_OUTCOME), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it.each([MFA_STATE.SUCCESS, MFA_STATE.FAILURE])('closes the modal from the %s outcome', (outcome) => {
            const actor = createActorAtState(openAt({[MFA_STATE.OUTCOME]: outcome}));

            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            const result = actor.getSnapshot();
            expect(result.matches(MFA_STATE.CLOSING)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });
    });

    describe('while the dialog is visible', () => {
        it('hides the dialog on DISMISS_CANCEL without touching the flow step', () => {
            const flow = {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING};
            const actor = createActorAtState(openAt(flow, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            actor.start();
            actor.send({type: 'DISMISS_CANCEL'});

            expect(matchesState(openAt(flow), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('lets the flow step finish and keeps the dialog up on the next step', () => {
            const actor = createActorAtState(openAt({[MFA_STATE.VALIDATE_CODE]: MFA_STATE.REQUESTING_REGISTRATION_CHALLENGE}, MFA_STATE.CANCEL_CONFIRM_VISIBLE), {
                validateCode: '123456',
            });

            actor.start();
            sendRequestRegistrationChallengeDone(actor, {success: true, challenge: MFA_TEST_REGISTRATION_CHALLENGE});

            expect(matchesState(openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('holds a registration that finishes behind the dialog before the ceremony, so the scenario action never starts', () => {
            const actor = createActorAtState(openAt(REGISTERING_KEY, MFA_STATE.CANCEL_CONFIRM_VISIBLE), {registrationKeyInfo: MFA_TEST_KEY_INFO});

            actor.start();
            sendRegisterCredentialDone(actor, {success: true});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).not.toHaveProperty('authorize');
            expect(snapshotToState(result).isScenarioActionInFlight).toBe(false);

            actor.stop();
        });

        it('ignores a second REQUEST_CANCEL', () => {
            const actor = createActorAtState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            expect(matchesState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        // A restored snapshot never evaluates `always`, so this case has to reach the outcome through a live event.
        // A scenario action already sent can't be held, so it is the step that finishes behind the dialog.
        it('hides the dialog once the flow reaches the outcome', () => {
            const actor = createActorAtState(openAt(EXECUTING_SCENARIO_ACTION, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            actor.start();
            sendExecuteScenarioActionDone(actor, {success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });
    });

    describe('confirming the cancel', () => {
        it('moves the flow to cancelling and hides the dialog', () => {
            const actor = createActorAtState(openAt(AUTHORIZING, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            actor.start();
            actor.send({type: 'CONFIRM_CANCEL'});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(MFA_STATE.CANCELLING), result.value)).toBe(true);
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });

        it('is ignored while the dialog is hidden', () => {
            const actor = createActorAtState(openAt(AUTHORIZING));

            actor.start();
            actor.send({type: 'CONFIRM_CANCEL'});

            expect(matchesState(openAt(AUTHORIZING), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('stops the running step and aborts its signal', () => {
            const {actor, getRunningStepSignal} = startRunningStepWithDialog();
            expect(actor.getSnapshot().children).toHaveProperty('requestRegistrationChallenge');
            expect(getRunningStepSignal()?.aborted).toBe(false);

            actor.send({type: 'CONFIRM_CANCEL'});

            expect(actor.getSnapshot().children).not.toHaveProperty('requestRegistrationChallenge');
            expect(getRunningStepSignal()?.aborted).toBe(true);

            actor.stop();
        });

        it('hands the scenario cancel logic and payload to the cancel actor', () => {
            let receivedInput: CancelScenarioInput | undefined;
            const {actor} = startRunningStepWithDialog(
                fromPromise<CancelScenarioOutput, CancelScenarioInput>(({input}) => {
                    receivedInput = input;
                    return new Promise(() => {});
                }),
            );

            actor.send({type: 'CONFIRM_CANCEL'});

            // BIOMETRICS_TEST defines no `onCancel`, so the actor falls back to the default cancel error.
            expect(receivedInput).toEqual({onCancel: undefined, payload: undefined});

            actor.stop();
        });

        it('hands a scenario-defined onCancel and its payload to the cancel actor', () => {
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

            actor.send({type: 'CONFIRM_CANCEL'});

            expect(receivedInput?.onCancel).toBe(scenario.onCancel);
            expect(receivedInput?.payload).toEqual(payload);

            actor.stop();
        });

        it('runs the cancel actor once on a double confirm', () => {
            let cancelRuns = 0;
            const {actor} = startRunningStepWithDialog(
                fromPromise<CancelScenarioOutput, CancelScenarioInput>(() => {
                    cancelRuns += 1;
                    return new Promise(() => {});
                }),
            );

            actor.send({type: 'CONFIRM_CANCEL'});
            actor.send({type: 'CONFIRM_CANCEL'});

            expect(cancelRuns).toBe(1);

            actor.stop();
        });
    });

    describe('while cancelling', () => {
        it('does not reopen the dialog on REQUEST_CANCEL', () => {
            const actor = createActorAtState(openAt(MFA_STATE.CANCELLING));

            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});

            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);

            actor.stop();
        });

        it('fails the flow with the cancel actor output', () => {
            const actor = createActorAtState(openAt(MFA_STATE.CANCELLING));

            actor.start();
            actor.send(createActorDoneEvent('cancelScenario', MFA_TEST_CANCEL_ERROR));

            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(result.context.error).toBe(MFA_TEST_CANCEL_ERROR);

            actor.stop();
        });

        it('fails the flow with an unhandled-exception error when the cancel logic throws', async () => {
            const {actor} = startRunningStepWithDialog(fromPromise<CancelScenarioOutput, CancelScenarioInput>(() => Promise.reject(new Error('Deny exploded'))));

            actor.send({type: 'CONFIRM_CANCEL'});
            await waitForBatchedUpdates();

            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(result.context.error).toEqual(createLocalMFAError(CONST.MULTIFACTOR_AUTHENTICATION.REASON.LOCAL_ERRORS.UNHANDLED_EXCEPTION, 'Cancel threw: Deny exploded'));

            actor.stop();
        });

        it('moves to closing on CLOSE_MODAL', () => {
            const actor = createActorAtState(openAt(MFA_STATE.CANCELLING));

            actor.start();
            actor.send({type: 'CLOSE_MODAL'});

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
            const {actor, registerCredentialInputs, finishCreatingKey} = startCreatingKey();

            await finishCreatingKey();

            expect(matchesState(openAt(REGISTERING_KEY), actor.getSnapshot().value)).toBe(true);
            expect(registerCredentialInputs).toEqual([{keyInfo: MFA_TEST_KEY_INFO}]);

            actor.stop();
        });

        it('stops the ceremony and aborts its signal, so the platform prompt never opens over the dialog', () => {
            const {actor, createCredentialInputs} = startCreatingKey();
            expect(createCredentialInputs.at(0)?.signal.aborted).toBe(false);

            actor.send({type: 'REQUEST_CANCEL'});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_CREATE, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).not.toHaveProperty('createCredential');
            expect(createCredentialInputs.at(0)?.signal.aborted).toBe(true);

            actor.stop();
        });

        it('drops a ceremony that finishes after the dialog opened and never registers its key', async () => {
            const {actor, registerCredentialInputs, finishCreatingKey} = startCreatingKey();
            actor.send({type: 'REQUEST_CANCEL'});

            await finishCreatingKey();

            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_CREATE, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.context.registrationKeyInfo).toBeUndefined();
            expect(registerCredentialInputs).toHaveLength(0);

            actor.stop();
        });

        it('restarts the ceremony with the same registration challenge once the dialog is dismissed', async () => {
            const {actor, createCredentialInputs, registerCredentialInputs, finishCreatingKey} = startCreatingKey();
            actor.send({type: 'REQUEST_CANCEL'});

            actor.send({type: 'DISMISS_CANCEL'});

            expect(matchesState(openAt(CREATING_KEY), actor.getSnapshot().value)).toBe(true);
            expect(createCredentialInputs).toHaveLength(2);
            expect(createCredentialInputs.at(1)?.input.registrationChallenge).toBe(MFA_TEST_REGISTRATION_CHALLENGE);
            expect(createCredentialInputs.at(1)?.signal.aborted).toBe(false);

            await finishCreatingKey();

            expect(matchesState(openAt(REGISTERING_KEY), actor.getSnapshot().value)).toBe(true);
            expect(registerCredentialInputs).toEqual([{keyInfo: MFA_TEST_KEY_INFO}]);

            actor.stop();
        });

        it('never restarts the ceremony once the cancel is confirmed', () => {
            const {actor, createCredentialInputs, registerCredentialInputs} = startCreatingKey();
            actor.send({type: 'REQUEST_CANCEL'});

            actor.send({type: 'CONFIRM_CANCEL'});

            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);
            expect(createCredentialInputs).toHaveLength(1);
            expect(registerCredentialInputs).toHaveLength(0);

            actor.stop();
        });

        it('keeps the backend registration running behind the dialog', async () => {
            const {actor, registerCredentialInputs, finishCreatingKey} = startCreatingKey();
            await finishCreatingKey();

            actor.send({type: 'REQUEST_CANCEL'});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(REGISTERING_KEY, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).toHaveProperty('registerCredential');
            expect(registerCredentialInputs).toHaveLength(1);

            actor.stop();
        });

        it('drops the key info when the flow leaves credential creation', async () => {
            const {actor, finishCreatingKey} = startCreatingKey();
            await finishCreatingKey();
            expect(actor.getSnapshot().context.registrationKeyInfo).toBe(MFA_TEST_KEY_INFO);

            actor.send({type: 'CLOSE_MODAL'});

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
            const {actor, scenarioActionInputs, finishSigning} = startSigning();

            await finishSigning();

            expect(matchesState(openAt(EXECUTING_SCENARIO_ACTION), actor.getSnapshot().value)).toBe(true);
            expect(scenarioActionInputs).toHaveLength(1);

            actor.stop();
        });

        it('stops the ceremony and aborts its signal, so the platform prompt never opens over the dialog', () => {
            const {actor, authorizeSignals} = startSigning();
            expect(authorizeSignals.at(0)?.aborted).toBe(false);

            actor.send({type: 'REQUEST_CANCEL'});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).not.toHaveProperty('authorize');
            expect(authorizeSignals.at(0)?.aborted).toBe(true);

            actor.stop();
        });

        it('drops a ceremony that finishes after the dialog opened and never sends the scenario action', async () => {
            const {actor, scenarioActionInputs, finishSigning} = startSigning();
            actor.send({type: 'REQUEST_CANCEL'});

            await finishSigning();

            const result = actor.getSnapshot();
            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.context.signedChallenge).toBeUndefined();
            expect(scenarioActionInputs).toHaveLength(0);

            actor.stop();
        });

        it('restarts the ceremony once the dialog is dismissed and sends the scenario action with its signed challenge', async () => {
            const {actor, context, authorizeSignals, scenarioActionInputs, finishSigning} = startSigning();
            actor.send({type: 'REQUEST_CANCEL'});

            actor.send({type: 'DISMISS_CANCEL'});

            expect(matchesState(openAt(SIGNING_CHALLENGE), actor.getSnapshot().value)).toBe(true);
            expect(authorizeSignals).toHaveLength(2);
            expect(authorizeSignals.at(1)?.aborted).toBe(false);

            await finishSigning();

            expect(matchesState(openAt(EXECUTING_SCENARIO_ACTION), actor.getSnapshot().value)).toBe(true);
            expect(scenarioActionInputs).toEqual([{runScenarioAction: context.runScenarioAction, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD}]);

            actor.stop();
        });

        it('never restarts the ceremony once the cancel is confirmed', () => {
            const {actor, authorizeSignals, scenarioActionInputs} = startSigning();
            actor.send({type: 'REQUEST_CANCEL'});

            actor.send({type: 'CONFIRM_CANCEL'});

            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);
            expect(authorizeSignals).toHaveLength(1);
            expect(scenarioActionInputs).toHaveLength(0);

            actor.stop();
        });

        it('drops the signed challenge when the flow leaves authorizing', async () => {
            const {actor, finishSigning} = startSigning();
            await finishSigning();
            expect(actor.getSnapshot().context.signedChallenge).toBe(MFA_TEST_SIGNED_CHALLENGE);

            actor.send({type: 'CLOSE_MODAL'});

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
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: false});

            expect(matchesState(openAt(SIGNING_CHALLENGE), actor.getSnapshot().value)).toBe(true);
            expect(getAuthorizeRuns()).toBe(1);

            actor.stop();
        });

        it('holds the ceremony while the dialog is up, so the platform prompt never covers it', async () => {
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: true});

            expect(matchesState(openAt(READY_TO_SIGN, MFA_STATE.CANCEL_CONFIRM_VISIBLE), actor.getSnapshot().value)).toBe(true);
            expect(actor.getSnapshot().children).not.toHaveProperty('authorize');
            expect(getAuthorizeRuns()).toBe(0);

            actor.stop();
        });

        it('starts the held ceremony once the dialog is dismissed', async () => {
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: true});

            actor.send({type: 'DISMISS_CANCEL'});

            expect(matchesState(openAt(SIGNING_CHALLENGE), actor.getSnapshot().value)).toBe(true);
            expect(getAuthorizeRuns()).toBe(1);

            actor.stop();
        });

        it('never starts the held ceremony once the cancel is confirmed', async () => {
            const {actor, getAuthorizeRuns} = await reachAuthorizing({isDialogUp: true});

            actor.send({type: 'CONFIRM_CANCEL'});

            expect(matchesState(openAt(MFA_STATE.CANCELLING), actor.getSnapshot().value)).toBe(true);
            expect(getAuthorizeRuns()).toBe(0);

            actor.stop();
        });
    });

    describe('while the scenario action is in flight', () => {
        it('reports the request in flight only while the scenario action runs', () => {
            expect(snapshotToState(mfaMachine.resolveState({value: openAt(SIGNING_CHALLENGE), context: createFlowContext()})).isScenarioActionInFlight).toBe(false);
            expect(snapshotToState(mfaMachine.resolveState({value: openAt(EXECUTING_SCENARIO_ACTION), context: createFlowContext()})).isScenarioActionInFlight).toBe(true);
        });

        it('opens the dialog but ignores CONFIRM_CANCEL, so no cancel races the request already sent', async () => {
            let cancelRuns = 0;
            const machine = mfaMachine.provide({
                actors: {
                    authorize: fromPromise<AuthorizeOutput, AuthorizeInput>(() =>
                        Promise.resolve({success: true, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD}),
                    ),
                    executeScenarioAction: fromPromise<ExecuteScenarioActionOutput, ExecuteScenarioActionInput>(() => new Promise(() => {})),
                    cancelScenario: fromPromise<CancelScenarioOutput, CancelScenarioInput>(() => {
                        cancelRuns += 1;
                        return new Promise(() => {});
                    }),
                },
            });
            const actor = createActor(machine, {snapshot: machine.resolveState({value: openAt({[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT}), context: createFlowContext()})});
            actor.start();
            actor.send({type: 'SOFT_PROMPT_APPROVED'});
            await waitForBatchedUpdates();
            expect(actor.getSnapshot().children).toHaveProperty('executeScenarioAction');

            actor.send({type: 'REQUEST_CANCEL'});
            actor.send({type: 'CONFIRM_CANCEL'});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(EXECUTING_SCENARIO_ACTION, MFA_STATE.CANCEL_CONFIRM_VISIBLE), result.value)).toBe(true);
            expect(result.children).toHaveProperty('executeScenarioAction');
            expect(snapshotToState(result).isScenarioActionInFlight).toBe(true);
            expect(cancelRuns).toBe(0);

            actor.stop();
        });

        it('shows the request result once it settles, hides the dialog and never runs the cancel', () => {
            const actor = createActorAtState(openAt(EXECUTING_SCENARIO_ACTION, MFA_STATE.CANCEL_CONFIRM_VISIBLE));

            actor.start();
            actor.send({type: 'CONFIRM_CANCEL'});
            sendExecuteScenarioActionDone(actor, {success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE});

            const result = actor.getSnapshot();
            expect(matchesState(openAt(FINALIZING_OUTCOME), result.value)).toBe(true);
            expect(result.context.scenarioResponse).toBe(MFA_TEST_SCENARIO_RESPONSE);
            expect(result.context.error).toBeUndefined();
            expect(snapshotToState(result).isCancelConfirmVisible).toBe(false);

            actor.stop();
        });
    });
});
