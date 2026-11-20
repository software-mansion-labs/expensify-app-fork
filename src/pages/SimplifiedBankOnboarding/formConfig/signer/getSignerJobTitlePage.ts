import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import getFormPage from '@pages/SimplifiedBankOnboarding/formConfig/getFormPage';
import type {FieldConfig, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

function getSignerJobTitlePage(id: PageID, jobTitle: string, translate: LocalizedTranslate): FormPageConfig {
    const fields: FieldConfig[] = [{type: 'text', id: INPUT_IDS.SIGNER_JOB_TITLE, label: translate('signerInfoStep.jobTitle'), defaultValue: jobTitle, isRequired: true}];
    return getFormPage(id, translate('signerInfoStep.whatsYourJobTitle'), fields, {translate, enabledWhenOffline: true});
}

export default getSignerJobTitlePage;
