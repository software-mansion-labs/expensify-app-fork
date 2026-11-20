import getFormPage from '@pages/SimplifiedBankOnboarding/formConfig/getFormPage';
/**
 * The bank step. The server describes its inputs for the country and the currency, and they split into the bank page
 * and the account holder page. Until the inputs arrive the bank page shows a loader. The request at the end creates the
 * bank account.
 */
import type {ConfirmationRow, FormPageConfig, PageConfig, PageID, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import areBankFieldsLoaded from '@pages/SimplifiedBankOnboarding/model/bankFields/areBankFieldsLoaded';
import getBankFieldOptionLabel from '@pages/SimplifiedBankOnboarding/model/bankFields/getBankFieldOptionLabel';
import {getAccountHolderDetailsFields, getBankAccountDetailsFields} from '@pages/SimplifiedBankOnboarding/model/bankFields/splitBankFields';
import {isGlobalAccountCreated} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import failRequest from '@pages/SimplifiedBankOnboarding/requests/failRequest';
import createGlobalBankAccount from '@pages/SimplifiedBankOnboarding/requests/nonUSD/createGlobalBankAccount';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type NonUSDStepInput from './types';

import getBankFieldConfig from './getBankFieldConfig';

const SUB_PAGES = SBO_CONST.NON_USD.BANK_INFO_SUB_PAGES;

type BankFieldGroup = {
    pageID: PageID;
    title: string;
    fields: BankFormField[];
};

function getFieldGroups({bankFields, translate}: NonUSDStepInput): BankFieldGroup[] {
    return [
        {pageID: SUB_PAGES.BANK_ACCOUNT_DETAILS, title: translate('bankInfoStep.whatAreYour'), fields: getBankAccountDetailsFields(bankFields)},
        {pageID: SUB_PAGES.ACCOUNT_HOLDER_DETAILS, title: translate('addPersonalBankAccount.accountHolderInformationStepHeader'), fields: getAccountHolderDetailsFields(bankFields)},
    ];
}

function getGroupPage({pageID, title, fields}: BankFieldGroup, {answers, translate}: NonUSDStepInput): FormPageConfig {
    const fieldConfigs = fields.map((field) => getBankFieldConfig(field, answers[field.id]));
    return getFormPage(pageID, title, fieldConfigs, {translate, enabledWhenOffline: true});
}

function getConfirmationRows(groups: BankFieldGroup[], {answers}: NonUSDStepInput): ConfirmationRow[] {
    return groups.flatMap(({pageID, fields}) => fields.map((field) => ({id: field.id, label: field.label, value: getBankFieldOptionLabel(field, answers[field.id]), editPageID: pageID})));
}

/** A group without inputs has no page. Until the inputs arrive, the bank page stands alone and waits for them. */
function getPages(input: NonUSDStepInput): PageConfig[] {
    const {answers, achData, currency, translate} = input;
    if (!areBankFieldsLoaded(input.bankFields, answers.country, currency)) {
        return [{kind: 'form', id: SUB_PAGES.BANK_ACCOUNT_DETAILS, isComplete: false, isLoading: true, title: translate('bankInfoStep.whatAreYour'), fields: []}];
    }
    const filledGroups = getFieldGroups(input).filter((group) => group.fields.length > 0);
    return [
        ...filledGroups.map((group) => getGroupPage(group, input)),
        {
            kind: 'confirmation',
            id: SUB_PAGES.CONFIRMATION,
            isComplete: isGlobalAccountCreated(achData),
            title: translate('bankInfoStep.letsDoubleCheck'),
            rows: getConfirmationRows(filledGroups, input),
        },
    ];
}

function getBankFieldValues(input: NonUSDStepInput): Record<string, string> {
    const fields = input.bankFields?.formFields ?? [];
    return Object.fromEntries(fields.map((field) => [field.id, input.answers[field.id]]));
}

function getBankInfoStep(input: NonUSDStepInput): StepConfig {
    const {answers, achData, policyID, currency, translate} = input;
    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.BANK_INFO,
        title: translate('bankAccount.bankInfo'),
        counterIndex: 1,
        isComplete: isGlobalAccountCreated(achData),
        pages: getPages(input),
        submit: () => {
            // The account belongs to a workspace, so a flow opened without one cannot create it. The entry always opens
            // the flow with a workspace, so the page shows an error instead of a Next that does nothing.
            if (!policyID) {
                return failRequest(REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT);
            }
            return createGlobalBankAccount({policyID, country: answers.country, currency, fields: getBankFieldValues(input)});
        },
        requestName: REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT,
    };
}

export default getBankInfoStep;
