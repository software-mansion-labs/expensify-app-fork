/**
 * Builds a plain form page. The page counts as complete when every field of it holds a valid value, so the resume
 * position and the step counter agree with what the user sees.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FieldConfig, FormPageConfig, PageID} from './types';

import isFormPageComplete from './validation/isFormPageComplete';

type FormPageOptions = {
    translate: LocalizedTranslate;

    /** The page saves only to the draft, so it can be submitted offline */
    enabledWhenOffline?: boolean;
};

function getFormPage(id: PageID, title: string, fields: FieldConfig[], {translate, enabledWhenOffline}: FormPageOptions): FormPageConfig {
    return {kind: 'form', id, title, fields, isComplete: isFormPageComplete(fields, translate), enabledWhenOffline};
}

export default getFormPage;
