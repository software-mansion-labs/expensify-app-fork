/**
 * The writes of the USD bank step: the manual bank account with trimmed numbers, and the account that the user picked
 * from the Plaid list. Both need the workspace of the route, so a flow opened without one cannot build them. Once the
 * server created the bank account, the typed numbers leave the draft, so the bank step shows the masked numbers that
 * the server keeps.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {OnboardingRequest, RequestSpec} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

function getBankAccountWriteOptions(): Pick<RequestSpec, 'onyxData' | 'errorKey'> {
    const writeOptions = getUSDWriteOptions(SBO_CONST.USD.STEP.BANK_ACCOUNT);

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
    build: ({bankAccount, account, draft}) => {
        if (!bankAccount.policyID) {
            return undefined;
        }
        const answers = getUSDAnswers(draft, account);
        return {
            type: 'write',
            command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY,
            params: {policyID: bankAccount.policyID, routingNumber: answers.routingNumber.trim(), accountNumber: answers.accountNumber.trim()},
            ...getBankAccountWriteOptions(),
        };
    },
};

const connectWithPlaidRequest: OnboardingRequest = {
    name: 'usd.bankAccount.connectWithPlaid',
    build: ({bankAccount, account, draft}) => {
        const {plaidAccountID} = getUSDAnswers(draft, account);
        if (!bankAccount.policyID || !plaidAccountID) {
            return undefined;
        }
        return {
            type: 'write',
            command: WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID,
            params: {policyID: bankAccount.policyID, plaidAccountID},
            ...getBankAccountWriteOptions(),
        };
    },
};

export {connectManuallyRequest, connectWithPlaidRequest};
