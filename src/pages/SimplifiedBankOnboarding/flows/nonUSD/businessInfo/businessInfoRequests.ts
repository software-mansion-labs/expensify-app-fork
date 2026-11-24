import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getCountryAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/country/getCountryAnswers';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import getBusinessInfoAnswers from './getBusinessInfoAnswers';

/** The picklists of the business step, the business types among them */
const picklistsRead: OnboardingRequest = {
    name: 'nonUSD.businessInfo.readPicklists',
    build: (data) => ({
        type: 'read',
        command: READ_COMMANDS.GET_ONBOARDING_FIELDS,
        params: {countryISO: getCountryAnswers(data).country},
        onyxData: {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS,
                    value: {isLoading: true},
                },
            ],
            finallyData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS,
                    value: {isLoading: false},
                },
            ],
        },
    }),
};

const companyDetailsRequest: OnboardingRequest = {
    name: 'nonUSD.businessInfo.saveCompany',
    build: (data) => ({
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS,
        params: {...data.bankAccount, ...getBusinessInfoAnswers(data)},
    }),
};

export {companyDetailsRequest, picklistsRead};
