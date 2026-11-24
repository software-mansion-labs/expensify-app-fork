import type {BankFieldID} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import getNonUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDWriteOptions';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** The inputs of the country and currency of the account. Without a country there is nothing to ask for. */
const bankFieldsRead: OnboardingRequest = {
    name: 'nonUSD.bankInfo.readFields',
    build: ({account, draft, currency}) => {
        const {country} = getNonUSDAnswers(draft, account, currency);
        if (!country) {
            return undefined;
        }
        return {
            type: 'read',
            command: READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS,
            params: {countryISO: country, currency},
            onyxData: {
                optimisticData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
                        value: {isLoading: true},
                    },
                ],
                successData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
                        value: {isLoading: false, isSuccess: true},
                    },
                ],
                failureData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
                        value: {isLoading: false, isSuccess: false},
                    },
                ],
            },
        };
    },
};

/**
 * Creates the account of the workspace. The fields are the inputs that the server described for the country, with an
 * empty text for an input without an answer, so an answer left from another country is not sent.
 */
function getCreateBankAccountRequest(fieldIDs: BankFieldID[]): OnboardingRequest {
    return {
        name: 'nonUSD.bankInfo.createAccount',
        build: ({bankAccount, account, draft, currency}) => {
            const {policyID} = bankAccount;
            if (!policyID) {
                return undefined;
            }
            const {country, bankFieldValues} = getNonUSDAnswers(draft, account, currency);
            return {
                type: 'write',
                command: WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
                params: {
                    policyID,
                    country,
                    currency,
                    fields: Object.fromEntries(fieldIDs.map((fieldID) => [fieldID, bankFieldValues[fieldID]])),
                },
                ...getNonUSDWriteOptions(),
            };
        },
    };
}

export {bankFieldsRead, getCreateBankAccountRequest};
