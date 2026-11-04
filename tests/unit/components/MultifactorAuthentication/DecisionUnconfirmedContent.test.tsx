import {act, fireEvent, screen} from '@testing-library/react-native';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as MfaRealUiMocks from 'tests/utils/mfa/realUi/mocks';

import Onyx from 'react-native-onyx';
import {MFA_TEST_ACCOUNT_ID, MFA_TEST_AUTH_METHOD, MFA_TEST_LOST_ANSWER_ERROR, MFA_TEST_SIGNED_CHALLENGE} from 'tests/utils/mfa/flowFixtures';
import renderMfaUi from 'tests/utils/mfa/realUi/harness';
import {authorizeControl, executeScenarioActionControl, loadRegistrationStateControl, resetMfaUiMocks, validateDeviceControl} from 'tests/utils/mfa/realUi/mocks';
import {translateLocal} from 'tests/utils/TestHelper';
import waitForBatchedUpdatesWithAct from 'tests/utils/waitForBatchedUpdatesWithAct';

// The same mocks as the UI walk in `viewMatchesMachine.test.tsx`; see the comments there.
jest.mock('@hooks/useResponsiveLayout');
jest.mock('@libs/XStateInspector', () => ({__esModule: true, default: {inspect: undefined}}));
jest.mock('@components/MultifactorAuthentication/machine/mfaActors', () => jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').mfaActorsMock());
jest.mock('@components/MultifactorAuthentication/biometrics/captureRegistrationState', () =>
    jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').captureRegistrationStateMock(),
);
jest.mock('@components/RenderHTML', () => jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').renderHtmlMock());
jest.mock('@components/Modal/ReanimatedModal', () => jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').reanimatedModalMock());
jest.mock('@components/MultifactorAuthentication/useSyncMfaModalNavigatorWithHistory', () => jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').syncHistoryMock());
jest.mock('@libs/Navigation/Navigation', () => jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').navigationMock());
jest.mock('@libs/actions/User', () => jest.requireActual<typeof MfaRealUiMocks>('tests/utils/mfa/realUi/mocks').userActionsMock());

const TEST_ID = CONST.MULTIFACTOR_AUTHENTICATION.TEST_ID;
const LOST = {success: false, error: MFA_TEST_LOST_ANSWER_ERROR} as const;

const CARD_ORDER_PAYLOAD = {
    legalFirstName: 'Test',
    legalLastName: 'User',
    phoneNumber: '+15555555555',
    addressCity: 'London',
    addressStreet: '1 Test Street',
    addressStreet2: '',
    addressZip: 'SW1A 1AA',
    addressCountry: 'GB',
    addressProvince: '',
    dob: '1990-01-01',
    pin: '1234',
    cardID: '1',
};

async function settle(settleActor: () => void) {
    await act(async () => settleActor());
    await waitForBatchedUpdatesWithAct();
}

/** Runs a returning user's flow into the scenario action, then loses its answer and the re-sent one. */
async function openUnconfirmedScreen(start: (executeScenario: ReturnType<typeof renderMfaUi>['executeScenario']) => Promise<void>) {
    const {executeScenario} = renderMfaUi();
    await waitForBatchedUpdatesWithAct();
    await act(async () => start(executeScenario));
    await waitForBatchedUpdatesWithAct();
    fireEvent(screen.getByTestId(TEST_ID.INITIAL_SCREEN), 'layout', {nativeEvent: {layout: {width: 1, height: 1, x: 0, y: 0}}});
    await waitForBatchedUpdatesWithAct();

    await settle(() => validateDeviceControl.resolve({success: true}));
    await settle(() => loadRegistrationStateControl.resolve({hasServerCredentials: true, hasLocalCredentials: true, hasEverAcceptedSoftPrompt: true}));
    await settle(() => authorizeControl.resolve({success: true, signedChallenge: MFA_TEST_SIGNED_CHALLENGE, authenticationMethod: MFA_TEST_AUTH_METHOD}));
    await settle(() => executeScenarioActionControl.resolve(LOST));
}

describe('the MFA "couldn\'t confirm" screen', () => {
    beforeEach(async () => {
        resetMfaUiMocks();
        await act(async () => {
            await Onyx.clear();
            await Onyx.merge(ONYXKEYS.SESSION, {accountID: MFA_TEST_ACCOUNT_ID});
        });
        await waitForBatchedUpdatesWithAct();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('says it is trying again while the re-sent request runs, then offers trying again for an idempotent scenario', async () => {
        // Given the scenario action's answer was lost
        await openUnconfirmedScreen((executeScenario) => executeScenario(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.BIOMETRICS_TEST));

        // Then the prompt says the request is being sent again
        expect(screen.getByText(translateLocal('multifactorAuthentication.unconfirmed.retrying'))).toBeOnTheScreen();

        // When the re-sent answer is lost too
        await settle(() => executeScenarioActionControl.resolve(LOST));

        // Then the screen says the result is unknown and offers trying again or closing
        expect(screen.getByTestId(TEST_ID.UNCONFIRMED_SCREEN)).toBeOnTheScreen();
        expect(screen.getByText(translateLocal('multifactorAuthentication.unconfirmed.title'))).toBeOnTheScreen();
        expect(screen.getByText(translateLocal('multifactorAuthentication.unconfirmed.retrySubtitle'))).toBeOnTheScreen();
        expect(screen.getByTestId(TEST_ID.UNCONFIRMED_RETRY_BUTTON)).toBeOnTheScreen();
        expect(screen.getByText(translateLocal('common.close'))).toBeOnTheScreen();
    });

    it("offers only acknowledging for a scenario that isn't idempotent, with the scenario's own copy", async () => {
        // Given the card order's answer was lost
        await openUnconfirmedScreen((executeScenario) => executeScenario(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.SET_PIN_ORDER_CARD, CARD_ORDER_PAYLOAD));

        // When the re-sent answer is lost too
        await settle(() => executeScenarioActionControl.resolve(LOST));

        // Then the screen uses the card order copy and offers no retry, since a second order could ship a second card
        expect(screen.getByTestId(TEST_ID.UNCONFIRMED_SCREEN)).toBeOnTheScreen();
        expect(screen.getByText(translateLocal('multifactorAuthentication.unconfirmed.cardOrderTitle'))).toBeOnTheScreen();
        expect(screen.getByText(translateLocal('multifactorAuthentication.unconfirmed.cardOrderSubtitle'))).toBeOnTheScreen();
        expect(screen.queryByTestId(TEST_ID.UNCONFIRMED_RETRY_BUTTON)).not.toBeOnTheScreen();
        expect(screen.getByText(translateLocal('common.buttonConfirm'))).toBeOnTheScreen();
    });
});
