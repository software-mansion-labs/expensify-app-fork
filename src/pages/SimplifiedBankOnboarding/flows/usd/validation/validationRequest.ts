/**
 * The write of the USD test deposit form. It sends the amounts that the user typed as one code. The server answer
 * changes the bank account state or counts a wrong try, and the validation step follows that state.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** The input is the trimmed amounts in the order of the inputs */
const validationRequest: OnboardingRequest<string[]> = {
    name: 'usd.validation.validateDeposits',
    build: ({bankAccount}, amounts) => ({
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT,
        params: {...bankAccount, validateCode: amounts.join(',')},
        ...getUSDWriteOptions(SBO_CONST.USD.STEP.VALIDATION),
    }),
};

export default validationRequest;
