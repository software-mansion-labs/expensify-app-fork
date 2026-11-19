import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidLegalName} from '@libs/ValidationUtils';

import getFormPage from '@pages/SimplifiedBankOnboarding/formConfig/getFormPage';
import type {FieldConfig, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

function getSignerNamePage(id: PageID, fullName: string, translate: LocalizedTranslate): FormPageConfig {
    const fields: FieldConfig[] = [
        {
            type: 'text',
            id: INPUT_IDS.SIGNER_FULL_NAME,
            label: translate('signerInfoStep.fullName'),
            defaultValue: fullName,
            isRequired: true,
            validate: (value) => (isValidLegalName(value) ? undefined : translate('bankAccount.error.fullName')),
        },
    ];
    return getFormPage(id, translate('signerInfoStep.whatsYourName'), fields, {translate, enabledWhenOffline: true});
}

export default getSignerNamePage;
