import getLocalizedText from '@components/DynamicForm/shared/getLocalizedText';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField} from '@src/types/onyx';

function getFieldLabel(field: DynamicFormField, translate: LocalizedTranslate): string {
    return getLocalizedText(translate, field.labelKey, field.label) ?? field.key;
}

export default getFieldLabel;
