import type {FieldConfig, FormPageConfig, PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import {connectBankAccountManually, connectBankAccountWithPlaid} from '@pages/SimplifiedBankOnboarding/requests/usd/connectBankAccount';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import type USDStepInput from './types';

import hasPassedServerStep from './hasPassedServerStep';

const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

const SKIPPED: RequestOutcome = {status: 'skipped'};

function getManualPage({answers, achData, translate}: USDStepInput): FormPageConfig {
    const isLocked = !!achData?.bankAccountID;
    const fields: FieldConfig[] = [
        {
            type: 'text',
            id: INPUT_IDS.ROUTING_NUMBER,
            label: translate('bankAccount.routingNumber'),
            defaultValue: answers.routingNumber,
            inputMode: CONST.INPUT_MODE.NUMERIC,
            isRequired: true,
            isLocked,
            validate: (value) => (ROUTING_NUMBER_PATTERN.test(value.trim()) ? undefined : translate('bankAccount.error.routingNumber')),
        },
        {
            type: 'text',
            id: INPUT_IDS.ACCOUNT_NUMBER,
            label: translate('bankAccount.accountNumber'),
            defaultValue: answers.accountNumber,
            inputMode: CONST.INPUT_MODE.NUMERIC,
            isRequired: true,
            isLocked,
            validate: (value) => {
                const accountNumber = value.trim();
                const isValid = CONST.BANK_ACCOUNT.REGEX.US_ACCOUNT_NUMBER.test(accountNumber) || CONST.BANK_ACCOUNT.REGEX.MASKED_US_ACCOUNT_NUMBER.test(accountNumber);
                return isValid ? undefined : translate('bankAccount.error.accountNumber');
            },
        },
    ];
    return {
        kind: 'form',
        id: SBO_CONST.USD.BANK_INFO_SUB_PAGES.MANUAL,
        isComplete: isFormPageComplete(fields, translate),
        title: translate('bankAccount.manuallyAdd'),
        description: translate('bankAccount.checkHelpLine'),
        fields,
    };
}

function getBankPage(input: USDStepInput): PageConfig {
    if (input.answers.setupType === SBO_CONST.SETUP_TYPE.PLAID) {
        return {kind: 'custom', id: SBO_CONST.USD.BANK_INFO_SUB_PAGES.PLAID, component: 'plaid', isComplete: !!input.achData?.bankAccountID};
    }
    return getManualPage(input);
}

function submitBankAccount({answers, policyID}: USDStepInput): Promise<RequestOutcome> {
    if (!policyID) {
        return Promise.resolve(SKIPPED);
    }
    if (answers.setupType === SBO_CONST.SETUP_TYPE.PLAID) {
        if (!answers.plaidAccountID) {
            return Promise.resolve(SKIPPED);
        }
        return connectBankAccountWithPlaid({policyID, plaidAccountID: answers.plaidAccountID});
    }
    return connectBankAccountManually({policyID, routingNumber: answers.routingNumber.trim(), accountNumber: answers.accountNumber.trim()});
}

/** The bank account details, typed by hand or picked from the bank through Plaid, as the user chose on the entry page */
function getBankAccountStep(input: USDStepInput): StepConfig {
    return {
        id: SBO_CONST.USD.PAGE_NAMES.BANK_ACCOUNT,
        title: input.translate('bankAccount.bankInfo'),
        counterIndex: 1,
        isComplete: hasPassedServerStep(input.achData, SBO_CONST.USD.STEP.BANK_ACCOUNT),
        pages: [getBankPage(input)],
        submit: () => submitBankAccount(input),
        requestName: REQUEST_NAMES.CONNECT_BANK_ACCOUNT,
    };
}

export default getBankAccountStep;
