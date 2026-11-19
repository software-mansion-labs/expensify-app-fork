import {isValidCompanyName} from '@libs/ValidationUtils';

import type {FieldConfig, FormPageConfig, PicklistOption, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import saveGlobalCompany from '@pages/SimplifiedBankOnboarding/requests/nonUSD/saveGlobalCompany';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type NonUSDStepInput from './types';

const SUB_PAGES = SBO_CONST.NON_USD.BUSINESS_INFO_SUB_PAGES;

function getBusinessTypeOptions({picklists}: NonUSDStepInput): PicklistOption[] {
    return (picklists?.picklists?.businessType ?? []).map((businessType) => ({value: businessType.id, label: businessType.name}));
}

function getNamePage({answers, translate}: NonUSDStepInput): FormPageConfig {
    const fields: FieldConfig[] = [
        {
            type: 'text',
            id: INPUT_IDS.COMPANY_NAME,
            label: translate('businessInfoStep.legalBusinessName'),
            defaultValue: answers.companyName,
            isRequired: true,
            validate: (value) => (isValidCompanyName(value) ? undefined : translate('bankAccount.error.companyName')),
        },
    ];
    return {kind: 'form', id: SUB_PAGES.NAME, isComplete: isFormPageComplete(fields, translate), title: translate('businessInfoStep.whatsTheBusinessName'), fields, enabledWhenOffline: true};
}

/** The business types come from the server. The page waits for them, unless it already has a value to show. */
function getBusinessTypePage(input: NonUSDStepInput, options: PicklistOption[]): FormPageConfig {
    const {answers, translate} = input;
    const fields: FieldConfig[] = [
        {
            type: 'picklist',
            id: INPUT_IDS.BUSINESS_TYPE,
            label: translate('businessInfoStep.businessType'),
            defaultValue: answers.businessType,
            options,
            modalTitle: translate('businessInfoStep.selectBusinessType'),
            searchTitle: translate('businessInfoStep.findBusinessType'),
            isRequired: true,
        },
    ];
    return {
        kind: 'form',
        id: SUB_PAGES.BUSINESS_TYPE,
        isComplete: isFormPageComplete(fields, translate),
        isLoading: options.length === 0 && !answers.businessType,
        title: translate('businessInfoStep.whatTypeOfBusinessIsIt'),
        fields,
        enabledWhenOffline: true,
    };
}

/** The legal name and the type of the business, saved together at the end of the step */
function getBusinessInfoStep(input: NonUSDStepInput): StepConfig {
    const {answers, corpay, bankAccount, translate} = input;
    const options = getBusinessTypeOptions(input);
    const businessTypeLabel = options.find((option) => option.value === answers.businessType)?.label ?? answers.businessType;

    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.BUSINESS_INFO,
        title: translate('businessInfoStep.businessInfoTitle'),
        counterIndex: 2,
        isComplete: !!corpay?.companyName && !!corpay.businessType,
        pages: [
            getNamePage(input),
            getBusinessTypePage(input, options),
            {
                kind: 'confirmation',
                id: SUB_PAGES.CONFIRMATION,
                isComplete: true,
                title: translate('businessInfoStep.letsDoubleCheck'),
                rows: [
                    {id: 'companyName', label: translate('businessInfoStep.legalBusinessName'), value: answers.companyName, editPageID: SUB_PAGES.NAME},
                    {id: 'businessType', label: translate('businessInfoStep.businessType'), value: businessTypeLabel, editPageID: SUB_PAGES.BUSINESS_TYPE},
                ],
            },
        ],
        submit: () => saveGlobalCompany(bankAccount, {companyName: answers.companyName, businessType: answers.businessType}),
        requestName: REQUEST_NAMES.SAVE_GLOBAL_COMPANY,
    };
}

export default getBusinessInfoStep;
