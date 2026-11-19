import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import {isEmptyObject} from '@src/types/utils/EmptyObject';

import getDefaultValues from './getDefaultValues';
import validateFields from './validateFields';

/** A form page is complete when the values it starts with already pass its validation, so the flow can resume after it */
function isFormPageComplete(fields: FieldConfig[], translate: LocalizedTranslate): boolean {
    return isEmptyObject(validateFields(fields, getDefaultValues(fields), translate));
}

export default isFormPageComplete;
