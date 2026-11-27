import {act, screen} from '@testing-library/react-native';

import {setForceOffline} from '@libs/NetworkState';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {read} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import {getBankFormFields} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type React from 'react';
import type {OnyxKey, OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import {EUR_POLICY_ID, openFlowPage, USD_POLICY_ID} from '../../utils/SimplifiedBankOnboardingTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));

jest.mock('@components/ActivityIndicator', () => {
    const ReactModule = jest.requireActual<typeof React>('react');
    const {View} = jest.requireActual<{View: React.ComponentType<{testID?: string}>}>('react-native');
    return jest.fn(() => ReactModule.createElement(View, {testID: 'ActivityIndicator'}));
});

const LOADER_TEST_ID = 'ActivityIndicator';
const NOT_FOUND_TEST_ID = 'NotFoundPage';

const {NON_USD, USD} = SBO_CONST;

type ServerAnswer = {
    /** The data that the server sends with its answer */
    updates: Array<OnyxUpdate<OnyxKey>>;
    isSuccess: boolean;
};

/** The answers of the reads that were sent, which a test lets the server give when it wants */
let heldAnswers: Array<() => Promise<void>> = [];

/** Each read waits for the server until the test calls `answerHeldReads`, so the test sees the page while the read is pending */
function holdReads({updates, isSuccess}: ServerAnswer) {
    jest.mocked(read).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? []);
        heldAnswers.push(() =>
            Onyx.update(updates)
                .then(() => Onyx.update(isSuccess ? (onyxData.successData ?? []) : (onyxData.failureData ?? [])))
                .then(() => Onyx.update(onyxData.finallyData ?? [])),
        );
    });
}

async function answerHeldReads() {
    const answers = heldAnswers;
    heldAnswers = [];
    await act(async () => {
        await Promise.all(answers.map((answer) => answer()));
    });
    await waitForBatchedUpdatesWithAct();
}

describe('OnboardingFlowPage reads on open', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(read).mockReset();
        heldAnswers = [];
        setForceOffline(false);
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterEach(async () => {
        // A read that never got its answer must not leak into the next test
        await answerHeldReads();
    });

    it('shows a loader on the bank page until the bank inputs of the country arrive, then the form', async () => {
        // Given a German EUR setup without the bank inputs, which only the server knows
        holdReads({
            updates: [
                {
                    onyxMethod: Onyx.METHOD.SET,
                    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
                    value: {bankCountry: SBO_CONST.COUNTRY.DE, bankCurrency: SBO_CONST.CURRENCY.EUR, formFields: getBankFormFields(SBO_CONST.COUNTRY.DE)},
                },
            ],
            isSuccess: true,
        });

        // When the bank page opens
        await openFlowPage(
            {kind: 'nonUSD', params: {policyID: EUR_POLICY_ID, page: NON_USD.PAGE_NAMES.BANK_INFO, subPage: NON_USD.BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS}},
            {achData: {policyID: EUR_POLICY_ID, currentStep: USD.STEP.BANK_ACCOUNT, subStep: ''}, draft: {country: SBO_CONST.COUNTRY.DE}},
        );

        // Then the page reads the inputs and shows a loader, because it has no form to show without them
        expect(read).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId(LOADER_TEST_ID)).toBeOnTheScreen();
        expect(screen.queryByLabelText('IBAN')).not.toBeOnTheScreen();

        // When the server answers with the inputs
        await answerHeldReads();

        // Then the form with the inputs of the country replaces the loader
        expect(screen.getByLabelText('IBAN')).toBeOnTheScreen();
        expect(screen.queryByTestId(LOADER_TEST_ID)).not.toBeOnTheScreen();
    });

    it('shows the not found view when the business types could not be read', async () => {
        // Given a created German bank account and a client that stored no business types yet
        holdReads({updates: [], isSuccess: false});
        await openFlowPage(
            {kind: 'nonUSD', params: {policyID: EUR_POLICY_ID, page: NON_USD.PAGE_NAMES.BUSINESS_INFO, subPage: NON_USD.BUSINESS_INFO_SUB_PAGES.BUSINESS_TYPE}},
            {
                achData: {policyID: EUR_POLICY_ID, bankAccountID: 1001, currency: SBO_CONST.CURRENCY.EUR, country: SBO_CONST.COUNTRY.DE, created: '2026-11-27'},
                draft: {companyName: 'Acme GmbH'},
            },
        );
        expect(read).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId(LOADER_TEST_ID)).toBeOnTheScreen();

        // When the server rejects the read
        await answerHeldReads();

        // Then the page shows the not found view instead of a loader that would never end
        expect(screen.getByTestId(NOT_FOUND_TEST_ID)).toBeOnTheScreen();
        expect(screen.queryByTestId(LOADER_TEST_ID)).not.toBeOnTheScreen();
    });

    it('loads the identity check that opened offline once the connection returns', async () => {
        // Given a USD setup with the personal info saved, opened on the identity check without a connection
        holdReads({updates: [{onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, value: 'onfido-token'}], isSuccess: true});
        setForceOffline(true);
        await openFlowPage(
            {kind: 'usd', params: {policyID: USD_POLICY_ID, page: USD.PAGE_NAMES.VERIFY_IDENTITY, subPage: USD.VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK}},
            {
                achData: {
                    policyID: USD_POLICY_ID,
                    bankAccountID: 1001,
                    currentStep: USD.STEP.REQUESTOR,
                    subStep: SBO_CONST.SETUP_TYPE.MANUAL,
                    accountNumber: 'XXXXXX7890',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    dob: '1990-01-01',
                    ssnLast4: '1234',
                },
            },
        );

        // A read made offline is dropped, so the page waits without a token
        expect(read).not.toHaveBeenCalled();
        expect(screen.getByTestId(LOADER_TEST_ID)).toBeOnTheScreen();

        // When the connection returns and the server answers with the token
        act(() => setForceOffline(false));
        await waitForBatchedUpdatesWithAct();
        await answerHeldReads();

        // Then the page sends the read it still owed and shows the identity check
        expect(read).toHaveBeenCalledTimes(1);
        expect(screen.getByText('[mock] Pass the identity check')).toBeOnTheScreen();
    });
});
