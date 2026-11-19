import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FieldConfig, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

function getSignerJobTitlePage(id: PageID, jobTitle: string, translate: LocalizedTranslate): FormPageConfig {
    const fields: FieldConfig[] = [{type: 'text', id: INPUT_IDS.SIGNER_JOB_TITLE, label: translate('signerInfoStep.jobTitle'), defaultValue: jobTitle, isRequired: true}];
    return {kind: 'form', id, isComplete: isFormPageComplete(fields, translate), title: translate('signerInfoStep.whatsYourJobTitle'), fields, enabledWhenOffline: true};
}

export default getSignerJobTitlePage;
