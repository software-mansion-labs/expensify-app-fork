/**
 * The reads of the mock Plaid widget: the link token that starts the widget, and the exchange of the public token from
 * the bank login for the list of bank accounts.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** The token that the fake widget returns after the bank login. The mock server accepts any value. */
const MOCK_PUBLIC_TOKEN = 'mock-public-token';

const plaidLoginRead: OnboardingRequest = {
    name: 'usd.bankAccount.openPlaidLogin',
    build: () => ({type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_LOGIN, params: {}}),
};

const plaidAccountSelectorRead: OnboardingRequest = {
    name: 'usd.bankAccount.openPlaidAccountSelector',
    build: () => ({type: 'read', command: READ_COMMANDS.OPEN_PLAID_BANK_ACCOUNT_SELECTOR, params: {publicToken: MOCK_PUBLIC_TOKEN}}),
};

export {plaidAccountSelectorRead, plaidLoginRead};
