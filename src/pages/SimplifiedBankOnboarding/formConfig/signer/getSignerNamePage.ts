import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidLegalName} from '@libs/ValidationUtils';

import type {FieldConfig, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
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
    return {kind: 'form', id, isComplete: isFormPageComplete(fields, translate), title: translate('signerInfoStep.whatsYourName'), fields, enabledWhenOffline: true};
}

export default getSignerNamePage;
