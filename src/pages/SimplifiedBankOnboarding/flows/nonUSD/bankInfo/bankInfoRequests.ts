import type {BankFieldID} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getCountryAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/country/getCountryAnswers';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import getBankInfoAnswers from './getBankInfoAnswers';

/** The inputs of the country and currency of the account. Without a country there is nothing to ask for. */
const bankFieldsRead: OnboardingRequest = {
    name: 'nonUSD.bankInfo.readFields',
    build: (data) => {
        const {country} = getCountryAnswers(data);
        if (!country) {
            return undefined;
        }
        return {
            type: 'read',
            command: READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS,
            params: {countryISO: country, currency: data.currency},
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
        build: (data) => {
            const {policyID} = data.bankAccount;
            if (!policyID) {
                return undefined;
            }
            const {country} = getCountryAnswers(data);
            const {bankFieldValues} = getBankInfoAnswers(data);
            return {
                type: 'write',
                command: WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
                params: {
                    policyID,
                    country,
                    currency: data.currency,
                    fields: Object.fromEntries(fieldIDs.map((fieldID) => [fieldID, bankFieldValues[fieldID]])),
                },
            };
        },
    };
}

export {bankFieldsRead, getCreateBankAccountRequest};
