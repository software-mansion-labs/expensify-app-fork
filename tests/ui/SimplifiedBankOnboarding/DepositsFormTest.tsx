import {fireEvent, screen} from '@testing-library/react-native';

import {setForceOffline} from '@libs/NetworkState';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import {openFlowPage, USD_POLICY_ID} from '../../utils/SimplifiedBankOnboardingTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));

const {USD} = SBO_CONST;
const BANK_ACCOUNT_ID = 1001;
const [AMOUNT_1, AMOUNT_2, AMOUNT_3] = SBO_CONST.MOCK.MICRO_DEPOSIT_AMOUNTS;

/** Each write stays pending, so the second press comes while the first send is still in flight */
function holdWrites() {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? []);
    });
}

describe('DepositsForm', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(write).mockReset();
        setForceOffline(false);

        // Clearing the status entry also ends a write that never got its answer, so its key leaves the guard
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => Onyx.clear());

    it('sends the amounts once when the user presses the button twice', async () => {
        // Given a manual bank account that waits for the test deposits, with the three amounts typed in
        holdWrites();
        await openFlowPage(
            {kind: 'usd', params: {policyID: USD_POLICY_ID, page: USD.PAGE_NAMES.VALIDATION, subPage: USD.VALIDATION_SUB_PAGES.VALIDATE}},
            {
                achData: {
                    policyID: USD_POLICY_ID,
                    bankAccountID: BANK_ACCOUNT_ID,
                    currentStep: USD.STEP.VALIDATION,
                    subStep: SBO_CONST.SETUP_TYPE.MANUAL,
                    accountNumber: 'XXXXXX7890',
                    isOnfidoSetupComplete: true,
                    state: SBO_CONST.STATE.PENDING,
                },
                draft: {amount1: AMOUNT_1, amount2: AMOUNT_2, amount3: AMOUNT_3},
            },
        );

        // When the user presses the button twice before the server answers
        const validateButton = screen.getByText('connectBankAccountStep.validateButtonText');
        fireEvent.press(validateButton);
        fireEvent.press(validateButton);
        await waitForBatchedUpdatesWithAct();

        // Then the server gets the amounts once, because each wrong attempt counts toward the limit that blocks the account
        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledWith(
            WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT,
            {policyID: USD_POLICY_ID, bankAccountID: BANK_ACCOUNT_ID, validateCode: [AMOUNT_1, AMOUNT_2, AMOUNT_3].join(',')},
            expect.anything(),
        );
    });
});
