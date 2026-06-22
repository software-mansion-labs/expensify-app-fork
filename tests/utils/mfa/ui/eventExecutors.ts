import {act, fireEvent, screen} from '@testing-library/react-native';
import type {MfaEvent} from '@components/MultifactorAuthentication/machine/types';
import {handleInitialScreenLayout} from '@components/MultifactorAuthentication/mfaNavigation';
import {MFA_TEST_SCENARIO_NAME} from '../mfaTestFixtures';
import {flushMfaUi, getMfaControls} from './harness';
import {pendingModalClose} from './mocks';

type MfaEventType = MfaEvent['type'];
type MfaEventExecutor = () => Promise<void>;

/** Translated `common.buttonConfirm` shown on the outcome screen's confirm button (and back button). */
const CONFIRM_BUTTON_TEXT = 'Got it';

/**
 * The dictionary the model walk drives the real UI with: one entry per machine event, each performing
 * the gesture (or the system step) that produces that event in production.
 *
 * Not every event is a DOM gesture in this slice: `INIT` is fired by an external consumer through the
 * public API (no button inside the MFA modal starts a flow), and `MODAL_CLOSED` is the navigator's
 * teardown signal rather than a user action - here we run the exact callback the navigator handed us.
 * `satisfies Record<MfaEventType, ...>` makes a new machine event a compile error until it gets an executor.
 */
/* eslint-disable @typescript-eslint/naming-convention -- keys mirror the machine's event type union. */
const mfaEventExecutors = {
    INIT: async () => {
        await act(async () => {
            await getMfaControls().executeScenario(MFA_TEST_SCENARIO_NAME);
        });
        await flushMfaUi();
        // The transparent initial screen's onLayout does not fire in jsdom; call the exact handler it
        // wires so the buffered push to the outcome screen runs, just like a real layout pass.
        act(() => handleInitialScreenLayout());
        await flushMfaUi();
    },
    CLOSE_MODAL: async () => {
        fireEvent.press(screen.getByText(CONFIRM_BUTTON_TEXT));
        await flushMfaUi();
    },
    MODAL_CLOSED: async () => {
        act(() => pendingModalClose.run());
        await flushMfaUi();
    },
} satisfies Record<MfaEventType, MfaEventExecutor>;
/* eslint-enable @typescript-eslint/naming-convention */

export default mfaEventExecutors;
