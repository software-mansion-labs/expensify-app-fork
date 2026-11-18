import pendingValidationRedirectMachine, {KEEPS_ACCOUNT_DATA_TAG, PENDING_VALIDATION_REDIRECT_ACTION} from '@pages/ReimbursementAccount/pendingValidationRedirectMachine';

import type {EventFrom, SnapshotFrom} from 'xstate';

import {initialTransition, transition} from 'xstate';

type Snapshot = SnapshotFrom<typeof pendingValidationRedirectMachine>;
type Event = EventFrom<typeof pendingValidationRedirectMachine>;

/** Sends the events in order and returns the last snapshot with the actions of every step */
function send(events: Event[], from: Snapshot = initialTransition(pendingValidationRedirectMachine)[0]) {
    let snapshot = from;
    const actionTypes: string[] = [];
    for (const event of events) {
        const [nextSnapshot, actions] = transition(pendingValidationRedirectMachine, snapshot, event);
        snapshot = nextSnapshot;
        actionTypes.push(...actions.map((action) => action.type));
    }
    return {snapshot, actionTypes};
}

const PENDING_ON_SCREEN: Event = {type: 'UPDATE', shouldRedirect: true, isFocused: true};
const PENDING_COVERED: Event = {type: 'UPDATE', shouldRedirect: true, isFocused: false};

describe('pendingValidationRedirectMachine', () => {
    it('redirects once and keeps the account data while the validation step is open', () => {
        // Given a page that has not redirected yet
        // When it renders a pending account several times, as Onyx keeps pushing updates
        const {snapshot, actionTypes} = send([{type: 'UPDATE', shouldRedirect: false, isFocused: true}, PENDING_ON_SCREEN, PENDING_ON_SCREEN]);

        // Then it redirects only once, and keeps the data that the validation step reads
        expect(actionTypes).toEqual([PENDING_VALIDATION_REDIRECT_ACTION.REDIRECT_TO_VALIDATION]);
        expect(snapshot.hasTag(KEEPS_ACCOUNT_DATA_TAG)).toBe(true);
    });

    it('leaves the setup only when the user comes back after the validation step covered the page', () => {
        // Given a page whose redirect is still in flight, and a page that was covered when it redirected
        const inFlight = send([PENDING_ON_SCREEN]).snapshot;
        const coveredOnRedirect = send([PENDING_COVERED]).snapshot;

        // When the page gets focus again
        // Then the in-flight page waits, since it has not been covered yet, and the covered pages leave the setup
        expect(send([PENDING_ON_SCREEN], inFlight).actionTypes).toEqual([]);
        expect(send([PENDING_COVERED, PENDING_ON_SCREEN], inFlight).actionTypes).toEqual([PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW]);
        expect(send([PENDING_ON_SCREEN], coveredOnRedirect).actionTypes).toEqual([PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW]);
    });

    it('stops keeping the account data once the user leaves from the loader', () => {
        // Given a page that redirected
        const redirected = send([PENDING_ON_SCREEN]).snapshot;

        // When the user presses back on its loader
        const {snapshot, actionTypes} = send([{type: 'LEAVE'}], redirected);

        // Then it leaves the setup, and the unmount can clear the account since nothing reads it anymore
        expect(actionTypes).toEqual([PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW]);
        expect(snapshot.hasTag(KEEPS_ACCOUNT_DATA_TAG)).toBe(false);
    });
});
