/**
 * The USD business step as plan config. The pages, their validation and the request that saves the company live
 * here, so the controller and the renderer stay generic.
 */
import {isValidCompanyName, isValidTaxID} from '@libs/ValidationUtils';

import getFormPage from '@pages/SimplifiedBankOnboarding/formConfig/getFormPage';
import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {areCompanyDetailsLocked} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import saveCompany from '@pages/SimplifiedBankOnboarding/requests/usd/saveCompany';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import type USDStepInput from './types';

import hasPassedServerStep from './hasPassedServerStep';

const SUB_PAGES = SBO_CONST.USD.BUSINESS_INFO_SUB_PAGES;

/** The company name, tax ID and type. Once the server checked the company, the name and the tax ID are locked. */
function getBusinessInfoStep(input: USDStepInput): StepConfig {
    const {answers, achData, bankAccount, translate} = input;
    const isLocked = areCompanyDetailsLocked(achData);

    return {
        id: SBO_CONST.USD.PAGE_NAMES.COMPANY,
        title: translate('businessInfoStep.businessInfo'),
        counterIndex: SBO_CONST.USD.STEP_INDEX.BUSINESS_INFO,
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.COMPANY),
        pages: [
            getFormPage(
                SUB_PAGES.NAME,
                translate('businessInfoStep.enterTheNameOfYourBusiness'),
                [
                    {
                        type: 'text',
                        id: INPUT_IDS.COMPANY_NAME,
                        label: translate('businessInfoStep.businessName'),
                        defaultValue: answers.companyName,
                        isRequired: true,
                        isLocked,
                        validate: (value) => (isValidCompanyName(value) ? undefined : translate('bankAccount.error.companyName')),
                    },
                ],
                input,
            ),
            getFormPage(
                SUB_PAGES.TAX_ID,
                translate('businessInfoStep.enterYourCompanyTaxIdNumber'),
                [
                    {
                        type: 'text',
                        id: INPUT_IDS.COMPANY_TAX_ID,
                        label: translate('businessInfoStep.taxIDNumber'),
                        defaultValue: answers.companyTaxID,
                        placeholder: translate('businessInfoStep.taxIDNumberPlaceholder'),
                        inputMode: CONST.INPUT_MODE.NUMERIC,
                        hint: `The mock server rejects ${SBO_CONST.MOCK.REJECTED_TAX_ID}.`,
                        isRequired: true,
                        isLocked,
                        validate: (value) => (isValidTaxID(value) ? undefined : translate('bankAccount.error.taxID')),
                    },
                ],
                input,
            ),
            getFormPage(
                SUB_PAGES.INCORPORATION_TYPE,
                translate('businessInfoStep.selectYourCompanyType'),
                [
                    {
                        type: 'picklist',
                        id: INPUT_IDS.INCORPORATION_TYPE,
                        label: translate('businessInfoStep.companyType'),
                        defaultValue: answers.incorporationType,
                        options: Object.values(SBO_CONST.USD.INCORPORATION_TYPES).map((incorporationType) => ({value: incorporationType, label: incorporationType})),
                        isRequired: true,
                    },
                ],
                input,
            ),
            {
                kind: 'confirmation',
                id: SUB_PAGES.CONFIRMATION,
                isComplete: true,
                title: translate('businessInfoStep.letsDoubleCheck'),
                rows: [
                    {id: 'companyName', label: translate('businessInfoStep.businessName'), value: answers.companyName, editPageID: SUB_PAGES.NAME},
                    {id: 'companyTaxID', label: translate('businessInfoStep.taxIDNumber'), value: answers.companyTaxID, editPageID: SUB_PAGES.TAX_ID},
                    {id: 'incorporationType', label: translate('businessInfoStep.companyType'), value: answers.incorporationType, editPageID: SUB_PAGES.INCORPORATION_TYPE},
                ],
            },
        ],
        submit: () =>
            saveCompany(bankAccount, {
                companyName: answers.companyName,
                companyTaxID: answers.companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, ''),
                incorporationType: answers.incorporationType,
            }),
        requestKey: getRequestKey(REQUEST_NAMES.SAVE_COMPANY, bankAccount),
    };
}

export default getBusinessInfoStep;
