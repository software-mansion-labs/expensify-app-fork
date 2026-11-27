/**
 * The writes of the USD bank step: the manual bank account with trimmed numbers, and the account that the user picked
 * from the Plaid list. Both need the workspace of the route, so a flow opened without one cannot build them. Once the
 * server created the bank account, the typed numbers leave the draft, so the bank step shows the masked numbers that
 * the server keeps.
 */
import type {OnboardingRequest, RequestSpec} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import getBankAccountAnswers from './getBankAccountAnswers';

function getBankAccountWriteOptions(): Pick<RequestSpec, 'onyxData' | 'errorKey'> {
    const writeOptions = getUSDWriteOptions();

    return {
        ...writeOptions,
        onyxData: {
            ...writeOptions.onyxData,
            successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, value: {routingNumber: null, accountNumber: null}}],
        },
    };
}

const connectManuallyRequest: OnboardingRequest = {
    name: 'usd.bankAccount.connectManually',
    build: (data) => {
        const {policyID} = data.bankAccount;
        if (!policyID) {
            return undefined;
        }
        const answers = getBankAccountAnswers(data);
        return {
            type: 'write',
            command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY,
            params: {policyID, routingNumber: answers.routingNumber.trim(), accountNumber: answers.accountNumber.trim()},
            ...getBankAccountWriteOptions(),
        };
    },
};

const connectWithPlaidRequest: OnboardingRequest = {
    name: 'usd.bankAccount.connectWithPlaid',
    build: (data) => {
        const {policyID} = data.bankAccount;
        const {plaidAccountID} = getBankAccountAnswers(data);
        if (!policyID || !plaidAccountID) {
            return undefined;
        }
        return {
            type: 'write',
            command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID,
            params: {policyID, plaidAccountID},
            ...getBankAccountWriteOptions(),
        };
    },
};

export {connectManuallyRequest, connectWithPlaidRequest};
