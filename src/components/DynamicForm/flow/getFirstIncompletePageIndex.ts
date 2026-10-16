import getContentErrors from '@components/DynamicForm/content/getContentErrors';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField, DynamicFormPage} from '@src/types/onyx';

import isPageShown from './pages/isPageShown';

/** The first page with an error, or -1 when every page is complete. Pages the answers hide are never asked, so they cannot be the first gap. */
function getFirstIncompletePageIndex(pages: DynamicFormPage[], allFields: DynamicFormField[], answers: DynamicFormValues, translate: LocalizedTranslate): number {
    return pages.findIndex((page) => isPageShown(page, answers, allFields) && Object.keys(getContentErrors(page.content, answers, translate, allFields)).length > 0);
}

export default getFirstIncompletePageIndex;
