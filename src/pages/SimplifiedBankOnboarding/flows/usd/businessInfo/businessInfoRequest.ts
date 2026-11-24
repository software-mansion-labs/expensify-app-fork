/**
 * The one write of the USD business info step, sent by its confirmation. The tax ID loses every separator before it is
 * sent, as in the real flow.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import CONST from '@src/CONST';

const businessInfoRequest: OnboardingRequest = {
    name: 'usd.businessInfo.confirm',
    build: ({bankAccount, account, draft}) => {
        const answers = getUSDAnswers(draft, account);
        return {
            type: 'write',
            command: WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION,
            params: {
                ...bankAccount,
                companyName: answers.companyName,
                companyTaxID: answers.companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, ''),
                incorporationType: answers.incorporationType,
            },
            ...getUSDWriteOptions(SBO_CONST.USD.STEP.COMPANY),
        };
    },
};

export default businessInfoRequest;
