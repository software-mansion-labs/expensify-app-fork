import getAnswerKeys from '@components/DynamicForm/utils/getAnswerKeys';
import getContentFields from '@components/DynamicForm/utils/getContentFields';
import isSupportedField from '@components/DynamicForm/utils/isSupportedField';
import {getPages} from '@components/DynamicForm/utils/paginate';

import type {ErrorFields} from '@src/types/onyx/OnyxCommon';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {WiseOnboardingForm} from './getWiseOnboardingForm';

/**
 * The first onboarding page where the user can fix an answer the server rejected. A read-only answer or a key no page collects has no such page,
 * so its error is shown where the request was made.
 */
function getPageWithServerError(form: WiseOnboardingForm, errorFields: ErrorFields | null | undefined) {
    return getPages(form).find((page) =>
        getContentFields(page.content)
            .filter(isSupportedField)
            .filter((field) => !field.readonly)
            .flatMap(getAnswerKeys)
            .some((key) => !isEmptyObject(errorFields?.[key] ?? {})),
    );
}

export default getPageWithServerError;
