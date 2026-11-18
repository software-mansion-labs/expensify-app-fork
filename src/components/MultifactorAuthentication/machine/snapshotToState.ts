import CONST from '@src/CONST';

import type {SnapshotFrom} from 'xstate';

import type MFAMachine from './mfaMachine';
import type {MfaContext, MfaModalState} from './types';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

type MfaSnapshot = SnapshotFrom<typeof MFAMachine>;

/** The machine-derived state consumers read: the wired context subset plus the modal lifecycle state. */
type MfaState = MfaContext & {
    modalState: MfaModalState;

    /** Whether the machine currently accepts a request for a fresh validate-code email. */
    canResendValidateCode: boolean;

    /** Whether the submitted validate code is currently being validated. */
    isValidateCodeFormSubmitting: boolean;

    /** Whether the cancel-confirmation dialog is currently visible. */
    isCancelConfirmVisible: boolean;

    /** Whether the validate-code screen currently shows the inline invalid-code error. */
    showsInvalidCodeError: boolean;

    /** Whether the prompt screen is processing a non-interactive biometric step: credential creation or authorization. */
    isProcessingPrompt: boolean;

    /**
     * Whether the flow is running (or just ran) the authorization ceremony. Distinct from
     * `isProcessingPrompt` (which also covers credential creation) because the prompt screen swaps its
     * copy only for this sub-state - see `PromptPage`'s title override.
     */
    isAuthorizing: boolean;

    /** Whether the flow holds its next request until the device is back online, so the screen shows the offline view. */
    isWaitingForNetwork: boolean;

    /** Whether the flow re-sends a scenario action whose answer was lost, so the screen says it is trying again. */
    isResending: boolean;

    /** Whether the app can't tell whether the scenario action went through, so the screen asks the user to check or try again. */
    isDecisionUnconfirmed: boolean;

    /** Whether the unconfirmed screen offers trying again with a fresh challenge (idempotent scenarios only). */
    canRetryUnconfirmed: boolean;
};

function getModalState(snapshot: MfaSnapshot): MfaModalState {
    if (snapshot.matches(MFA_STATE.OPEN)) {
        return MFA_STATE.OPEN;
    }
    return snapshot.matches(MFA_STATE.CLOSING) ? MFA_STATE.CLOSING : MFA_STATE.CLOSED;
}

/**
 * Maps the machine snapshot to the state shape consumers read. The modal lifecycle is derived from
 * the chart, not stored: `modalState` mirrors the top-level state and drives the navigator's mount,
 * teardown animation, and unmount.
 *
 * Transitional: this wrapper lets existing consumers keep reading `state.X` while the machine is built
 * out. Once the chart is complete, consumers will read the machine directly via `useSelector` from
 * `@xstate/react` (a dedicated later PR), which retires this function and the `MfaState` bridge shape.
 */
function snapshotToState(snapshot: MfaSnapshot): MfaState {
    return {
        ...snapshot.context,
        modalState: getModalState(snapshot),
        canResendValidateCode: snapshot.can({type: 'RESEND_VALIDATE_CODE'}),
        isValidateCodeFormSubmitting: snapshot.context.validateCodePresentationPhase === MFA_STATE.REQUESTING_REGISTRATION_CHALLENGE,
        isProcessingPrompt: snapshot.context.promptPresentationPhase === MFA_STATE.CREATING_CREDENTIAL || snapshot.context.promptPresentationPhase === MFA_STATE.AUTHORIZING,
        isAuthorizing: snapshot.context.promptPresentationPhase === MFA_STATE.AUTHORIZING,
        isWaitingForNetwork: snapshot.hasTag('waitingForNetwork') && snapshot.matches({[MFA_STATE.OPEN]: {[MFA_STATE.NETWORK]: MFA_STATE.OFFLINE}}),
        isResending:
            snapshot.context.resendAttempts > 0 &&
            snapshot.matches({
                [MFA_STATE.OPEN]: {[MFA_STATE.FLOW]: {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: {[MFA_STATE.EXECUTING_SCENARIO_ACTION]: MFA_STATE.AWAITING_RESULT}}}},
            }),
        isDecisionUnconfirmed: snapshot.matches({[MFA_STATE.OPEN]: {[MFA_STATE.FLOW]: {[MFA_STATE.PROMPT]: {[MFA_STATE.AUTHORIZING]: MFA_STATE.DECISION_UNCONFIRMED}}}}),
        canRetryUnconfirmed: snapshot.can({type: 'RETRY_WITH_NEW_CHALLENGE'}),
        isCancelConfirmVisible: snapshot.matches({[MFA_STATE.OPEN]: {[MFA_STATE.CANCEL_CONFIRM]: MFA_STATE.CANCEL_CONFIRM_VISIBLE}}),
        showsInvalidCodeError: snapshot.matches({
            [MFA_STATE.OPEN]: {
                [MFA_STATE.FLOW]: {
                    [MFA_STATE.VALIDATE_CODE]: {
                        [MFA_STATE.AWAITING_VALIDATE_CODE]: MFA_STATE.INVALID_CODE,
                    },
                },
            },
        }),
    };
}

export default snapshotToState;
export type {MfaState};
