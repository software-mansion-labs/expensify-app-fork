import {act, renderHook} from '@testing-library/react-native';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {openFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {goToVerifyAccount, openFirstFlowStep} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import useSetupOptionPress from '@pages/SimplifiedBankOnboarding/entry/views/options/useSetupOptionPress';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import Onyx from 'react-native-onyx';

import {TEST_POLICY_ID} from '../../utils/BankOnboardingLabTestUtils';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/entry/entryNavigation', () => ({
    goToVerifyAccount: jest.fn(),
    openFirstFlowStep: jest.fn(),
}));
jest.mock('@pages/SimplifiedBankOnboarding/core/flow/flowRoutes', () => ({
    ...jest.requireActual<Record<string, unknown>>('@pages/SimplifiedBankOnboarding/core/flow/flowRoutes'),
    openFlow: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
}));

const BACK_TO = ROUTES.SETTINGS_BANK_ONBOARDING_LAB;

async function renderOptionPress() {
    const rendered = renderHook(() => useSetupOptionPress({policyID: TEST_POLICY_ID, backTo: BACK_TO, isNonUSD: false, currency: SBO_CONST.CURRENCY.USD, isChangingBankAccount: false}));
    await waitForBatchedUpdatesWithAct();
    return rendered;
}

async function press(option: () => void) {
    await act(async () => {
        option();
        await waitForBatchedUpdates();
    });
}

describe('useSetupOptionPress', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(goToVerifyAccount).mockClear();
        jest.mocked(openFirstFlowStep).mockClear();
        jest.mocked(openFlow).mockClear();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('remembers the option of an unvalidated user and opens the verify page instead of the flow', async () => {
        // Given a user who has not validated the account
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: false});
        const {result} = await renderOptionPress();

        // When the user picks Plaid
        await press(result.current.connectWithPlaid);

        // Then the option waits for the validation, and nothing of the setup is prepared yet
        expect(await Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED)).toBe(SBO_CONST.SETUP_TYPE.PLAID);
        expect(goToVerifyAccount).toHaveBeenCalledWith(TEST_POLICY_ID, BACK_TO);
        expect(openFirstFlowStep).not.toHaveBeenCalled();
        expect((await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT))?.setupType).toBeUndefined();
    });

    it('prepares the remembered option once the user is validated', async () => {
        // Given an option that an unvalidated user picked before the verify page opened
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: false});
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED, SBO_CONST.SETUP_TYPE.MANUAL);
        await renderOptionPress();

        // When the verify page validates the user
        await act(async () => {
            await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: true});
            await waitForBatchedUpdates();
        });

        // Then the draft holds the remembered option for the flow that the verify page opens, and the option is forgotten
        expect((await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT))?.setupType).toBe(SBO_CONST.SETUP_TYPE.MANUAL);
        expect(await Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED)).toBeUndefined();
        expect(openFirstFlowStep).not.toHaveBeenCalled();
    });

    it('prepares the option of a validated user and opens the first step of the flow', async () => {
        // Given a validated user
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: true});
        const {result} = await renderOptionPress();

        // When the user picks the manual setup
        await press(result.current.connectManually);

        // Then the draft names the manual setup, which the bank step reads, and the flow opens on its first step
        expect((await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT))?.setupType).toBe(SBO_CONST.SETUP_TYPE.MANUAL);
        expect(openFirstFlowStep).toHaveBeenCalledWith({policyID: TEST_POLICY_ID, backTo: BACK_TO, isNonUSD: false});
        expect(goToVerifyAccount).not.toHaveBeenCalled();
    });

    it('continues a USD setup in its manual variant once the draft says so', async () => {
        // Given the options screen of a started USD setup
        const {result} = await renderOptionPress();

        // When the user continues the setup
        await press(result.current.continueSetup);

        // Then the flow opens without a step after the draft names the manual setup, so the flow resumes on its own
        expect((await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT))?.setupType).toBe(SBO_CONST.SETUP_TYPE.MANUAL);
        expect(openFlow).toHaveBeenCalledTimes(1);
        expect(openFlow).toHaveBeenCalledWith({kind: 'usd', policyID: TEST_POLICY_ID, backTo: BACK_TO});
    });
});
