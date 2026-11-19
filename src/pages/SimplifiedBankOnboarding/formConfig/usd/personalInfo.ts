import {isValidSSNLastFour} from '@libs/ValidationUtils';

import getDateOfBirthField from '@pages/SimplifiedBankOnboarding/formConfig/fields/getDateOfBirthField';
import getLegalNameFields from '@pages/SimplifiedBankOnboarding/formConfig/fields/getLegalNameFields';
import type {FieldConfig, FormPageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import savePersonalInfo from '@pages/SimplifiedBankOnboarding/requests/usd/savePersonalInfo';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import type USDStepInput from './types';

import hasPassedServerStep from './hasPassedServerStep';

const SUB_PAGES = SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES;

function getFormPage(id: string, title: string, fields: FieldConfig[], {translate}: USDStepInput): FormPageConfig {
    return {kind: 'form', id, title, fields, isComplete: isFormPageComplete(fields, translate), enabledWhenOffline: true};
}

/** The user's legal name, date of birth and the last four digits of the SSN, sent together after the confirmation */
function getPersonalInfoStep(input: USDStepInput): StepConfig {
    const {answers, achData, bankAccount, translate} = input;
    const hasServerPersonalInfo = !!achData?.firstName && !!achData.lastName && !!achData.dob && !!achData.ssnLast4;

    return {
        id: SBO_CONST.USD.PAGE_NAMES.REQUESTOR,
        title: translate('personalInfoStep.personalInfo'),
        counterIndex: 2,
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.REQUESTOR) || hasServerPersonalInfo,
        pages: [
            getFormPage(
                SUB_PAGES.FULL_NAME,
                translate('personalInfoStep.enterYourLegalFirstAndLast'),
                getLegalNameFields({firstName: INPUT_IDS.FIRST_NAME, lastName: INPUT_IDS.LAST_NAME}, answers, translate),
                input,
            ),
            getFormPage(SUB_PAGES.DATE_OF_BIRTH, translate('personalInfoStep.enterYourDateOfBirth'), [getDateOfBirthField(INPUT_IDS.DOB, answers.dob, translate)], input),
            getFormPage(
                SUB_PAGES.SSN,
                translate('personalInfoStep.enterTheLast4'),
                [
                    {
                        type: 'text',
                        id: INPUT_IDS.SSN_LAST_4,
                        label: translate('personalInfoStep.last4SSN'),
                        defaultValue: answers.ssnLast4,
                        inputMode: CONST.INPUT_MODE.NUMERIC,
                        maxLength: SBO_CONST.SSN_LAST_4_LENGTH,
                        hint: `The mock server rejects ${SBO_CONST.MOCK.REJECTED_SSN_LAST_4}.`,
                        isRequired: true,
                        validate: (value) => (isValidSSNLastFour(value) ? undefined : translate('bankAccount.error.ssnLast4')),
                    },
                ],
                input,
            ),
            {
                kind: 'confirmation',
                id: SUB_PAGES.CONFIRMATION,
                isComplete: true,
                title: translate('personalInfoStep.letsDoubleCheck'),
                rows: [
                    {id: 'legalName', label: translate('personalInfoStep.legalName'), value: `${answers.firstName} ${answers.lastName}`.trim(), editPageID: SUB_PAGES.FULL_NAME},
                    {id: 'dob', label: translate('common.dob'), value: answers.dob, editPageID: SUB_PAGES.DATE_OF_BIRTH},
                    {id: 'ssnLast4', label: translate('personalInfoStep.last4SSN'), value: answers.ssnLast4, editPageID: SUB_PAGES.SSN},
                ],
            },
        ],
        submit: () => savePersonalInfo(bankAccount, {firstName: answers.firstName, lastName: answers.lastName, dob: answers.dob, ssnLast4: answers.ssnLast4}, true),
        requestName: REQUEST_NAMES.SAVE_PERSONAL_INFO,
    };
}

export default getPersonalInfoStep;
