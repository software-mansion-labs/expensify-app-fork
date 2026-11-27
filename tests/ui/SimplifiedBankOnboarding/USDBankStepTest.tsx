import {fireEvent, screen} from '@testing-library/react-native';

import Navigation from '@libs/Navigation/Navigation';
import {setForceOffline} from '@libs/NetworkState';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {maskAccountNumber} from '@pages/SimplifiedBankOnboarding/mockBackend/handlers/buildResponse';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import {openFlowPage, USD_POLICY_ID} from '../../utils/SimplifiedBankOnboardingTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));

const {USD} = SBO_CONST;
const BANK_ACCOUNT_ID = 1001;
const BANK_NAME = 'First Platypus Bank';
const ROUTING_NUMBER = '011401533';
const CONNECTED_PLAID_ACCOUNT = {plaidAccountID: 'plaid-checking', bankName: BANK_NAME, accountNumber: '1111222233330000', routingNumber: ROUTING_NUMBER, mask: '0000'};
const OTHER_PLAID_ACCOUNT = {plaidAccountID: 'plaid-savings', bankName: BANK_NAME, accountNumber: '1111222233331111', routingNumber: ROUTING_NUMBER, mask: '1111'};

/** Where Next on the bank page leads once the bank account exists */
const PERSONAL_INFO_ROUTE = ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({
    policyID: USD_POLICY_ID,
    page: USD.PAGE_NAMES.REQUESTOR,
    subPage: USD.PERSONAL_INFO_SUB_PAGES.FULL_NAME,
});

/** The test renders one screen of the flow, so it records where a move would go instead of navigating */
function spyOnNavigation() {
    return jest.spyOn(Navigation, 'navigate').mockImplementation(() => {});
}

describe('USD bank step with a bank account on the server', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(read).mockReset();
        jest.mocked(write).mockReset();
        setForceOffline(false);
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(() => Onyx.clear());

    it('shows the connected Plaid account without the list and moves on without a pick', async () => {
        // Given a Plaid account that the server created, and the accounts of an earlier bank login that are still stored,
        // so the page could offer another account
        const navigate = spyOnNavigation();
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, {bankAccounts: [CONNECTED_PLAID_ACCOUNT, OTHER_PLAID_ACCOUNT]});
        await openFlowPage(
            {kind: 'usd', params: {policyID: USD_POLICY_ID, page: USD.PAGE_NAMES.BANK_ACCOUNT, subPage: USD.BANK_INFO_SUB_PAGES.PLAID}},
            {
                achData: {
                    policyID: USD_POLICY_ID,
                    bankAccountID: BANK_ACCOUNT_ID,
                    currentStep: USD.STEP.REQUESTOR,
                    subStep: SBO_CONST.SETUP_TYPE.PLAID,
                    bankName: BANK_NAME,
                    accountNumber: maskAccountNumber(CONNECTED_PLAID_ACCOUNT.accountNumber),
                    plaidAccountID: CONNECTED_PLAID_ACCOUNT.plaidAccountID,
                },
                draft: {country: SBO_CONST.COUNTRY.US, setupType: SBO_CONST.SETUP_TYPE.PLAID},
            },
        );

        // Then the page shows the account of the server and no list, because a new pick would go to the draft and never
        // reach the server, and it reads no link token, because it offers no bank login
        expect(screen.getByText(`bankAccount.accountEnding ${CONNECTED_PLAID_ACCOUNT.mask}`)).toBeOnTheScreen();
        expect(screen.queryByText(`${BANK_NAME} ${OTHER_PLAID_ACCOUNT.mask}`)).not.toBeOnTheScreen();
        expect(jest.mocked(read).mock.calls.map(([command]) => command)).not.toContain(READ_COMMANDS.OPEN_PLAID_BANK_LOGIN);

        // When the user presses Next
        fireEvent.press(screen.getByText('common.next'));
        await waitForBatchedUpdatesWithAct();

        // Then the flow opens the personal info step without sending the bank step again, which would move the server back
        expect(write).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(PERSONAL_INFO_ROUTE);
        expect((await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT))?.plaidAccountID).toBeUndefined();
    });

    it('moves on from the connected Plaid account without a connection', async () => {
        // Given a Plaid account that the server created, on a page that the user opened before the connection dropped
        const navigate = spyOnNavigation();
        await openFlowPage(
            {kind: 'usd', params: {policyID: USD_POLICY_ID, page: USD.PAGE_NAMES.BANK_ACCOUNT, subPage: USD.BANK_INFO_SUB_PAGES.PLAID}},
            {
                achData: {
                    policyID: USD_POLICY_ID,
                    bankAccountID: BANK_ACCOUNT_ID,
                    currentStep: USD.STEP.REQUESTOR,
                    subStep: SBO_CONST.SETUP_TYPE.PLAID,
                    bankName: BANK_NAME,
                    accountNumber: maskAccountNumber(CONNECTED_PLAID_ACCOUNT.accountNumber),
                    plaidAccountID: CONNECTED_PLAID_ACCOUNT.plaidAccountID,
                },
                draft: {country: SBO_CONST.COUNTRY.US, setupType: SBO_CONST.SETUP_TYPE.PLAID},
            },
        );
        setForceOffline(true);
        await waitForBatchedUpdatesWithAct();

        // When the user presses Next
        fireEvent.press(screen.getByText('common.next'));
        await waitForBatchedUpdatesWithAct();

        // Then the flow opens the personal info step, because the page sends nothing and works offline like the locked
        // manual page
        expect(write).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(PERSONAL_INFO_ROUTE);
    });

    it('moves on from the locked manual page without saving the masked numbers to the draft', async () => {
        // Given a manual bank account that the server created and returns with a masked account number
        const navigate = spyOnNavigation();
        await openFlowPage(
            {kind: 'usd', params: {policyID: USD_POLICY_ID, page: USD.PAGE_NAMES.BANK_ACCOUNT, subPage: USD.BANK_INFO_SUB_PAGES.MANUAL}},
            {
                achData: {
                    policyID: USD_POLICY_ID,
                    bankAccountID: BANK_ACCOUNT_ID,
                    currentStep: USD.STEP.REQUESTOR,
                    subStep: SBO_CONST.SETUP_TYPE.MANUAL,
                    routingNumber: ROUTING_NUMBER,
                    accountNumber: maskAccountNumber('1234567890'),
                },
                draft: {country: SBO_CONST.COUNTRY.US, setupType: SBO_CONST.SETUP_TYPE.MANUAL},
            },
        );

        // When the user presses Next on the page that shows the locked numbers
        fireEvent.press(screen.getByText('common.next'));
        await waitForBatchedUpdatesWithAct();

        // Then the flow opens the personal info step and the draft holds no number, because no request would clear the
        // masked one again, and in the draft it would win over the server value
        const draft = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
        expect(write).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(PERSONAL_INFO_ROUTE);
        expect(draft?.routingNumber).toBeUndefined();
        expect(draft?.accountNumber).toBeUndefined();
    });
});
