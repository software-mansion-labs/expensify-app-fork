import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import getNonUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDWriteOptions';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** The picklists of the business step, the business types among them */
const picklistsRead: OnboardingRequest = {
    name: 'nonUSD.businessInfo.readPicklists',
    build: ({account, draft, currency}) => ({
        type: 'read',
        command: READ_COMMANDS.GET_ONBOARDING_FIELDS,
        params: {countryISO: getNonUSDAnswers(draft, account, currency).country},
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
    build: ({bankAccount, account, draft, currency}) => {
        const {companyName, businessType} = getNonUSDAnswers(draft, account, currency);
        return {
            type: 'write',
            command: WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS,
            params: {...bankAccount, companyName, businessType},
            ...getNonUSDWriteOptions(),
        };
    },
};

export {companyDetailsRequest, picklistsRead};
