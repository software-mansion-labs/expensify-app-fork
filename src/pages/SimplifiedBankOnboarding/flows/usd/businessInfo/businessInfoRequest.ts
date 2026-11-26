/**
 * The one write of the USD business info step, sent by its confirmation. The tax ID loses every separator before it is
 * sent, as in the real flow.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import CONST from '@src/CONST';

import getBusinessInfoAnswers from './getBusinessInfoAnswers';

const businessInfoRequest: OnboardingRequest = {
    name: 'usd.businessInfo.confirm',
    build: (data) => {
        const answers = getBusinessInfoAnswers(data);
        return {
            type: 'write',
            command: WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION,
            params: {
                ...data.bankAccount,
                companyName: answers.companyName,
                companyTaxID: answers.companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, ''),
                incorporationType: answers.incorporationType,
            },
            ...getUSDWriteOptions(),
        };
    },
};

export default businessInfoRequest;
