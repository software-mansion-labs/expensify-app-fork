/**
 * The way the bank account entry page sends a pending USD account straight to the validation step, and the way it leaves the setup afterwards.
 * The page keeps the snapshot in a ref and runs the actions that a pure transition returns. The machine is not run as an actor.
 */
import {and, not, setup} from 'xstate';

/** What the page does when a transition asks for it */
const PENDING_VALIDATION_REDIRECT_ACTION = {
    REDIRECT_TO_VALIDATION: 'redirectToValidation',
    LEAVE_FLOW: 'leaveFlow',
} as const;

/** The validation step reads the account data, so the page must not clear it when it unmounts */
const KEEPS_ACCOUNT_DATA_TAG = 'keepsAccountData';

type PendingValidationRedirectEvent =
    /** The page rendered with these values */
    | {type: 'UPDATE'; shouldRedirect: boolean; isFocused: boolean}
    /** The user asked to leave the setup */
    | {type: 'LEAVE'};

const pendingValidationRedirectMachine = setup({
    // `{} as T` is how XState v5 takes types. The values are never read.
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    types: {
        events: {} as PendingValidationRedirectEvent,
        tags: {} as typeof KEEPS_ACCOUNT_DATA_TAG,
    },
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
    // The page runs the actions itself, so these only give them a name.
    actions: {
        [PENDING_VALIDATION_REDIRECT_ACTION.REDIRECT_TO_VALIDATION]: () => {},
        [PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW]: () => {},
    },
    guards: {
        shouldRedirect: ({event}) => event.type === 'UPDATE' && event.shouldRedirect,
        isFocused: ({event}) => event.type === 'UPDATE' && event.isFocused,
    },
}).createMachine({
    id: 'pendingValidationRedirect',
    initial: 'waiting',
    // Going back to the entry page would only redirect again, so every exit leaves the whole setup.
    on: {LEAVE: '.left'},
    states: {
        waiting: {
            on: {
                UPDATE: [
                    {guard: and(['shouldRedirect', not('isFocused')]), target: 'covered', actions: PENDING_VALIDATION_REDIRECT_ACTION.REDIRECT_TO_VALIDATION},
                    {guard: 'shouldRedirect', target: 'redirected', actions: PENDING_VALIDATION_REDIRECT_ACTION.REDIRECT_TO_VALIDATION},
                ],
            },
        },
        // The page is still focused until the validation step covers it, so focus alone cannot mean the user came back.
        redirected: {tags: KEEPS_ACCOUNT_DATA_TAG, on: {UPDATE: {guard: not('isFocused'), target: 'covered'}}},
        // Focus after the cover means the user came back, which the back handler cannot catch for the browser back button.
        covered: {tags: KEEPS_ACCOUNT_DATA_TAG, on: {UPDATE: {guard: and(['isFocused', 'shouldRedirect']), target: 'left'}}},
        left: {entry: PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW},
    },
});

export default pendingValidationRedirectMachine;
export {PENDING_VALIDATION_REDIRECT_ACTION, KEEPS_ACCOUNT_DATA_TAG};
