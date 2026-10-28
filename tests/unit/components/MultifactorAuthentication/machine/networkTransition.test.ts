import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import type {
    AuthorizeInput,
    AuthorizeOutput,
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
import addMFABreadcrumb from '@components/MultifactorAuthentication/observability/breadcrumbs';

import type {MFAResult} from '@libs/MultifactorAuthentication/shared/MFAResult';
import {setForceOffline} from '@libs/NetworkState';

import CONST from '@src/CONST';

import type {StateValue} from 'xstate';

import {createActorAtState, createFlowContext, openAt, sendAuthorizeDone, sendCreateCredentialDone} from 'tests/utils/mfa/flowActors';
import createInitEvent, {
    MFA_TEST_AUTH_METHOD,
    MFA_TEST_KEY_INFO,
    MFA_TEST_REGISTRATION_CHALLENGE,
    MFA_TEST_SCENARIO_RESPONSE,
    MFA_TEST_SIGNED_CHALLENGE,
    MFA_TEST_VALIDATE_CODE,
} from 'tests/utils/mfa/flowFixtures';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';
import {createActor, fromPromise, matchesState, waitFor} from 'xstate';

jest.mock('@components/MultifactorAuthentication/observability/breadcrumbs', () => ({__esModule: true, default: jest.fn()}));

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;
const HIDDEN = MFA_STATE.CANCEL_CONFIRM_HIDDEN;
const OFFLINE = MFA_STATE.OFFLINE;

const AWAITING_INPUT = {[MFA_STATE.VALIDATE_CODE]: {[MFA_STATE.AWAITING_VALIDATE_CODE]: MFA_STATE.AWAITING_INPUT}};
const REQUESTING_REGISTRATION_CHALLENGE = {[MFA_STATE.VALIDATE_CODE]: MFA_STATE.REQUESTING_REGISTRATION_CHALLENGE};
const AWAITING_SOFT_PROMPT = {[MFA_STATE.PROMPT]: MFA_STATE.AWAITING_SOFT_PROMPT};
const READY_TO_CREATE = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.READY_TO_CREATE}};
const CREATING_KEY = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.CREATING_KEY}};
const READY_TO_REGISTER = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.READY_TO_REGISTER}};
const REGISTERING_KEY = {[MFA_STATE.PROMPT]: {[MFA_STATE.CREATING_CREDENTIAL]: MFA_STATE.REGISTERING_KEY}};
const AUTHORIZING = {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING};
const READY_TO_SIGN = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.READY_TO_SIGN}};
const SIGNING_CHALLENGE = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.SIGNING_CHALLENGE}};
const EXECUTING_SCENARIO_ACTION = {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.EXECUTING_SCENARIO_ACTION}};
const FINALIZING_OUTCOME = {[MFA_STATE.OUTCOME]: MFA_STATE.FINALIZING_OUTCOME};

const AUTHORIZED: AuthorizeOutput = {success: true, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD};

/** Never settles, so the invoked actor stays running until the machine stops it. */
function pending<TOutput, TInput>() {
    return fromPromise<TOutput, TInput>(() => new Promise(() => {}));
}

/**
 * A step actor the test settles by hand. It records how often the machine started it and the signal of the
 * last run, so a test can tell a request that kept running from one that was stopped or sent again.
 */
function createControlledStep<TOutput, TInput>() {
    let calls = 0;
    let signal: AbortSignal | undefined;
    let resolve: (output: TOutput) => void = () => {};
    return {
        actor: fromPromise<TOutput, TInput>(({signal: runSignal}) => {
            calls += 1;
            signal = runSignal;
            return new Promise<TOutput>((onResolve) => {
                resolve = onResolve;
            });
        }),
        settle: async (output: TOutput) => {
            resolve(output);
            await waitForBatchedUpdates();
        },
        getCalls: () => calls,
        getSignal: () => signal,
    };
}

function isAt(actor: {getSnapshot: () => {value: StateValue}}, value: StateValue) {
    return matchesState(value, actor.getSnapshot().value);
}

// The graph-traversal suites never go offline (see `UNTRAVERSED_EVENT_TYPES` in `flowPaths.ts`), so this suite
// pins by hand which steps wait for the network and how they resume.

describe('MFA offline', () => {
    afterEach(() => {
        setForceOffline(false);
    });

    describe('breadcrumbs', () => {
        it('logs each network flip, so a flow that resumed is told apart from one that stayed offline', () => {
            // Given the outcome screen, where nothing waits for the network
            const actor = createActorAtState(openAt({[MFA_STATE.OUTCOME]: MFA_STATE.SUCCESS}));
            actor.start();
            jest.mocked(addMFABreadcrumb).mockClear();

            // When the device goes offline and comes back
            actor.send({type: 'NETWORK_OFFLINE'});
            actor.send({type: 'NETWORK_ONLINE'});

            // Then both flips are logged as network changes, not as a paused flow
            const scenario = createFlowContext().scenarioName;
            expect(jest.mocked(addMFABreadcrumb).mock.calls).toEqual([
                ['Network offline', {scenario}, 'warning'],
                ['Network online', {scenario}],
            ]);

            actor.stop();
        });
    });

    describe('submitting the validate code', () => {
        it('drops a code submitted offline and sends no request', () => {
            // Given the validate-code screen while offline, where the form is hidden but a submit can still land before the re-render
            const requestRegistrationChallenge = createControlledStep<RequestRegistrationChallengeOutput, RequestRegistrationChallengeInput>();
            const machine = mfaMachine.provide({actors: {requestRegistrationChallenge: requestRegistrationChallenge.actor}});
            const actor = createActor(machine, {snapshot: machine.resolveState({value: openAt(AWAITING_INPUT, HIDDEN, OFFLINE), context: createFlowContext()})});

            // When the code arrives
            actor.start();
            actor.send({type: 'VALIDATE_CODE_ENTERED', validateCode: MFA_TEST_VALIDATE_CODE});

            // Then nothing happens, because the request would fail without a network and the code may expire before reconnecting
            expect(isAt(actor, openAt(AWAITING_INPUT, HIDDEN, OFFLINE))).toBe(true);
            expect(actor.getSnapshot().context.validateCode).toBeUndefined();
            expect(requestRegistrationChallenge.getCalls()).toBe(0);

            actor.stop();
        });
    });

    describe('holding the ceremony', () => {
        it('holds authorization reached offline and starts it once back online', () => {
            // Given a returning user approves the soft prompt while offline
            const actor = createActorAtState(openAt(AWAITING_SOFT_PROMPT, HIDDEN, OFFLINE));
            actor.start();
            actor.send({type: 'SOFT_PROMPT_APPROVED'});
            expect(isAt(actor, openAt(READY_TO_SIGN, HIDDEN, OFFLINE))).toBe(true);

            // When the device comes back online
            actor.send({type: 'NETWORK_ONLINE'});

            // Then the ceremony starts on its own, so the user doesn't have to restart the flow
            expect(isAt(actor, openAt(SIGNING_CHALLENGE))).toBe(true);

            actor.stop();
        });

        it('keeps the credential ceremony held after the dialog is dismissed offline and starts it once back online', () => {
            // Given the dialog stopped the credential ceremony and the device then went offline
            const actor = createActorAtState(openAt(CREATING_KEY), {registrationChallenge: MFA_TEST_REGISTRATION_CHALLENGE});
            actor.start();
            actor.send({type: 'REQUEST_CANCEL'});
            actor.send({type: 'NETWORK_OFFLINE'});

            // When the user dismisses the dialog
            actor.send({type: 'DISMISS_CANCEL'});

            // Then the ceremony stays held, because the key it creates couldn't be registered offline
            expect(isAt(actor, openAt(READY_TO_CREATE, HIDDEN, OFFLINE))).toBe(true);

            // When the device comes back online
            actor.send({type: 'NETWORK_ONLINE'});

            // Then the ceremony starts again with the same registration challenge
            expect(isAt(actor, openAt(CREATING_KEY))).toBe(true);
            expect(actor.getSnapshot().context.registrationChallenge).toBe(MFA_TEST_REGISTRATION_CHALLENGE);

            actor.stop();
        });

        it('holds a key created offline and registers it once back online', () => {
            // Given the credential ceremony runs and the device goes offline before it finishes
            const actor = createActorAtState(openAt(CREATING_KEY, HIDDEN, OFFLINE), {registrationChallenge: MFA_TEST_REGISTRATION_CHALLENGE});
            actor.start();

            // When the ceremony creates the key
            sendCreateCredentialDone(actor, {success: true, keyInfo: MFA_TEST_KEY_INFO});

            // Then the key waits for the network and its info is kept, so the user isn't asked for the biometric again
            expect(isAt(actor, openAt(READY_TO_REGISTER, HIDDEN, OFFLINE))).toBe(true);
            expect(actor.getSnapshot().context.registrationKeyInfo).toBe(MFA_TEST_KEY_INFO);

            // When the device comes back online
            actor.send({type: 'NETWORK_ONLINE'});

            // Then the held key is registered
            expect(isAt(actor, openAt(REGISTERING_KEY))).toBe(true);
            expect(actor.getSnapshot().context.registrationKeyInfo).toBe(MFA_TEST_KEY_INFO);

            actor.stop();
        });

        it('drops a signature made offline and signs a fresh challenge once back online', () => {
            // Given the authorization ceremony runs and the device goes offline before it finishes
            const actor = createActorAtState(openAt(SIGNING_CHALLENGE, HIDDEN, OFFLINE));
            actor.start();

            // When the ceremony signs the challenge
            sendAuthorizeDone(actor, AUTHORIZED);

            // Then the signature is dropped and the flow waits, because the scenario action can't be sent offline
            expect(isAt(actor, openAt(READY_TO_SIGN, HIDDEN, OFFLINE))).toBe(true);
            expect(actor.getSnapshot().context.signedChallenge).toBeUndefined();
            expect(actor.getSnapshot().context.authenticationMethod).toBeUndefined();

            // When the device comes back online
            actor.send({type: 'NETWORK_ONLINE'});

            // Then the ceremony runs again, since the dropped challenge may have expired meanwhile
            expect(isAt(actor, openAt(SIGNING_CHALLENGE))).toBe(true);

            actor.stop();
        });

        it.each([
            {description: 'requesting the registration challenge', flow: REQUESTING_REGISTRATION_CHALLENGE},
            {description: 'registering the key', flow: REGISTERING_KEY},
            {description: 'signing the challenge', flow: SIGNING_CHALLENGE},
            {description: 'executing the scenario action', flow: EXECUTING_SCENARIO_ACTION},
        ])('stays on the step while $description when the device goes offline', ({flow}) => {
            // Given a step that talks to the backend is running
            const actor = createActorAtState(openAt(flow));
            actor.start();

            // When the device goes offline
            actor.send({type: 'NETWORK_OFFLINE'});

            // Then the step keeps its place, because only the next step waits for the network
            expect(isAt(actor, openAt(flow, HIDDEN, OFFLINE))).toBe(true);

            actor.stop();
        });
    });

    describe('with the running actors', () => {
        it('holds a flow started offline before any request and sends exactly one once back online', async () => {
            // Given the device is offline before the flow starts
            setForceOffline(true);
            const authorize = createControlledStep<AuthorizeOutput, AuthorizeInput>();
            const machine = mfaMachine.provide({
                actors: {
                    validateDevice: fromPromise<MFAResult, ValidateDeviceInput>(() => Promise.resolve({success: true})),
                    loadRegistrationState: fromPromise<LoadRegistrationStateOutput, LoadRegistrationStateInput>(() =>
                        Promise.resolve({hasServerCredentials: true, hasLocalCredentials: true, hasEverAcceptedSoftPrompt: true}),
                    ),
                    authorize: authorize.actor,
                },
            });
            const actor = createActor(machine);

            // When a returning user's flow reaches authorization on its own
            actor.start();
            actor.send(createInitEvent());
            await waitFor(actor, (snapshot) => snapshot.matches({[MFA_STATE.OPEN]: {[MFA_STATE.FLOW]: AUTHORIZING}}));

            // Then no request goes out, because the network watcher reported offline before the first network step
            expect(isAt(actor, openAt(READY_TO_SIGN, HIDDEN, OFFLINE))).toBe(true);
            expect(authorize.getCalls()).toBe(0);

            // When the device comes back online
            setForceOffline(false);

            // Then exactly one request goes out
            expect(isAt(actor, openAt(SIGNING_CHALLENGE))).toBe(true);
            expect(authorize.getCalls()).toBe(1);

            actor.stop();
        });

        /** A running step, entered live because `resolveState` doesn't start an invoked actor. */
        type RunningStep = {
            actor: ReturnType<typeof createActor<typeof mfaMachine>>;
            settle: () => Promise<void>;
            getCalls: () => number;
            getSignal: () => AbortSignal | undefined;
        };

        function startStep(
            from: StateValue,
            contextOverrides: Partial<MfaContext>,
            entryEvent: Parameters<RunningStep['actor']['send']>[0],
            actors: Parameters<typeof mfaMachine.provide>[0]['actors'],
        ) {
            const machine = mfaMachine.provide({actors: {finalizeOutcome: pending<FinalizeOutcomeOutput, FinalizeOutcomeInput>(), ...actors}});
            const actor = createActor(machine, {snapshot: machine.resolveState({value: openAt(from), context: createFlowContext(contextOverrides)})});
            actor.start();
            actor.send(entryEvent);
            return actor;
        }

        it.each([
            {
                description: 'requesting the registration challenge',
                flow: REQUESTING_REGISTRATION_CHALLENGE,
                next: AWAITING_SOFT_PROMPT,
                start: async (): Promise<RunningStep> => {
                    const step = createControlledStep<RequestRegistrationChallengeOutput, RequestRegistrationChallengeInput>();
                    const actor = startStep(AWAITING_INPUT, {}, {type: 'VALIDATE_CODE_ENTERED', validateCode: MFA_TEST_VALIDATE_CODE}, {requestRegistrationChallenge: step.actor});
                    return {actor, settle: () => step.settle({success: true, challenge: MFA_TEST_REGISTRATION_CHALLENGE}), getCalls: step.getCalls, getSignal: step.getSignal};
                },
            },
            {
                description: 'registering the key',
                flow: REGISTERING_KEY,
                // The ceremony that follows waits for the network.
                next: READY_TO_SIGN,
                start: async (): Promise<RunningStep> => {
                    const step = createControlledStep<RegisterCredentialOutput, RegisterCredentialInput>();
                    const actor = startStep(
                        AWAITING_SOFT_PROMPT,
                        {registrationChallenge: MFA_TEST_REGISTRATION_CHALLENGE},
                        {type: 'SOFT_PROMPT_APPROVED'},
                        {
                            createCredential: fromPromise<CreateCredentialOutput, CreateCredentialInput>(() => Promise.resolve({success: true, keyInfo: MFA_TEST_KEY_INFO})),
                            registerCredential: step.actor,
                        },
                    );
                    await waitForBatchedUpdates();
                    return {actor, settle: () => step.settle({success: true}), getCalls: step.getCalls, getSignal: step.getSignal};
                },
            },
            {
                description: 'signing the challenge',
                flow: SIGNING_CHALLENGE,
                // The signature can't be used offline, so the flow waits to sign again.
                next: READY_TO_SIGN,
                start: async (): Promise<RunningStep> => {
                    const step = createControlledStep<AuthorizeOutput, AuthorizeInput>();
                    const actor = startStep(AWAITING_SOFT_PROMPT, {}, {type: 'SOFT_PROMPT_APPROVED'}, {authorize: step.actor});
                    return {actor, settle: () => step.settle(AUTHORIZED), getCalls: step.getCalls, getSignal: step.getSignal};
                },
            },
            {
                description: 'executing the scenario action',
                flow: EXECUTING_SCENARIO_ACTION,
                next: FINALIZING_OUTCOME,
                start: async (): Promise<RunningStep> => {
                    const step = createControlledStep<ExecuteScenarioActionOutput, ExecuteScenarioActionInput>();
                    const actor = startStep(
                        AWAITING_SOFT_PROMPT,
                        {},
                        {type: 'SOFT_PROMPT_APPROVED'},
                        {
                            authorize: fromPromise<AuthorizeOutput, AuthorizeInput>(() => Promise.resolve(AUTHORIZED)),
                            executeScenarioAction: step.actor,
                        },
                    );
                    await waitForBatchedUpdates();
                    return {actor, settle: () => step.settle({success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE}), getCalls: step.getCalls, getSignal: step.getSignal};
                },
            },
        ])('keeps the request running while $description when the device goes offline', async ({flow, next, start}) => {
            // Given the step's request is in flight
            const {actor, settle, getCalls, getSignal} = await start();
            expect(isAt(actor, openAt(flow))).toBe(true);
            expect(getCalls()).toBe(1);

            // When the device goes offline
            actor.send({type: 'NETWORK_OFFLINE'});

            // Then the request is neither aborted nor sent again, because aborting can't stop an HTTP request already out
            expect(getSignal()?.aborted).toBe(false);
            expect(getCalls()).toBe(1);

            // When that same request returns
            await settle();

            // Then the flow moves on with its result
            expect(isAt(actor, openAt(next, HIDDEN, OFFLINE))).toBe(true);
            expect(getCalls()).toBe(1);

            actor.stop();
        });
    });
});
