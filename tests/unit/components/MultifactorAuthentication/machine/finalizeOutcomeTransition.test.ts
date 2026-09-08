import type {MfaMachineEvent} from '@components/MultifactorAuthentication/machine/machineEvents';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import type {FinalizeOutcomeInput, FinalizeOutcomeOutput} from '@components/MultifactorAuthentication/machine/types';

import {createMFAErrorFromApiResponse} from '@libs/MultifactorAuthentication/shared/MFAResult';

import CONST from '@src/CONST';

import type {ActorLogic, InputFrom, SnapshotFrom} from 'xstate';

import {createFlowContext} from 'tests/utils/mfa/flowActors';
import {MFA_TEST_AUTH_METHOD, MFA_TEST_SCENARIO_RESPONSE} from 'tests/utils/mfa/flowFixtures';
import {createActorDoneEvent} from 'tests/utils/mfa/flowPaths';
import {createActor, fromPromise} from 'xstate';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;
const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;

/**
 * `mfaMachine` only declares `MfaEvent`, so production code cannot send the events XState raises
 * itself. This test needs to inject a fabricated `authorize` done event, so it widens the machine's
 * event type the same way `tests/utils/mfa/flowPaths.ts` does for the shared graph-traversal machine.
 */
function withLifecycleEvents<M>(machine: M) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see the comment above.
    return machine as unknown as ActorLogic<SnapshotFrom<M>, MfaMachineEvent, InputFrom<M>>;
}

// The graph-traversal suites generate their expectations from the machine, so a transition pointed at
// a wrong target adjusts those expectations and still passes. This suite pins the exact input the
// machine builds for the finalize-outcome actor, including the two deliberate parity quirks with the
// legacy callback input (`message` carries the reason, and `httpStatusCode` does not fall back to the
// error's) documented on `mfaMachine.ts`'s `finalizingOutcome` invoke.

describe('MFA outcome finalization input', () => {
    it('maps a successful authorization into the finalize-outcome input', () => {
        let receivedInput: FinalizeOutcomeInput | undefined;
        const machine = mfaMachine.provide({
            actors: {
                finalizeOutcome: fromPromise<FinalizeOutcomeOutput, FinalizeOutcomeInput>(({input}) => {
                    receivedInput = input;
                    return new Promise(() => {});
                }),
            },
        });
        const snapshot = machine.resolveState({
            value: {[MFA_STATE.OPEN]: {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING}},
            context: createFlowContext({softPromptApproved: true, isRegistrationComplete: true}),
        });
        const actor = createActor(withLifecycleEvents(machine), {snapshot});

        actor.start();
        actor.send(createActorDoneEvent('authorize', {success: true, scenarioResponse: MFA_TEST_SCENARIO_RESPONSE, authenticationMethod: MFA_TEST_AUTH_METHOD}));

        expect(receivedInput).toMatchObject({
            isSuccessful: true,
            callbackInput: {httpStatusCode: MFA_TEST_SCENARIO_RESPONSE.httpStatusCode, message: MFA_TEST_SCENARIO_RESPONSE.reason, body: MFA_TEST_SCENARIO_RESPONSE.body},
            scenarioResponse: MFA_TEST_SCENARIO_RESPONSE,
            error: undefined,
            authenticationMethod: MFA_TEST_AUTH_METHOD,
            isRegistrationComplete: true,
            softPromptApproved: true,
        });

        actor.stop();
    });

    it("carries the error's reason into callbackInput.message but never its httpStatusCode, matching legacy", () => {
        let receivedInput: FinalizeOutcomeInput | undefined;
        const failureError = createMFAErrorFromApiResponse(404, REASON.LOCAL_ERRORS.HSM.CANCELED, 'Finalize input spec failure');
        const machine = mfaMachine.provide({
            actors: {
                finalizeOutcome: fromPromise<FinalizeOutcomeOutput, FinalizeOutcomeInput>(({input}) => {
                    receivedInput = input;
                    return new Promise(() => {});
                }),
            },
        });
        const snapshot = machine.resolveState({value: {[MFA_STATE.OPEN]: {[MFA_STATE.PROMPT]: MFA_STATE.AUTHORIZING}}, context: createFlowContext()});
        const actor = createActor(withLifecycleEvents(machine), {snapshot});

        actor.start();
        actor.send(createActorDoneEvent('authorize', {success: false, error: failureError}));

        expect(receivedInput).toMatchObject({
            isSuccessful: false,
            error: failureError,
            // `httpStatusCode` is undefined here (not `failureError.httpStatusCode`) - odd but deliberate
            // parity with legacy, which never fell back to the error's HTTP status for this field.
            callbackInput: {httpStatusCode: undefined, message: failureError.reason, body: undefined},
        });

        actor.stop();
    });
});
