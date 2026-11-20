import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {doesContainReservedWord, isValidLegalName} from '@libs/ValidationUtils';

import CONST from '@src/CONST';

/** The rules of a legal first or last name, in the order of the shared full name step */
function getLegalNameError(name: string, translate: LocalizedTranslate): string | undefined {
    if (doesContainReservedWord(name, CONST.DISPLAY_NAME.RESERVED_NAMES)) {
        return translate('personalDetails.error.containsReservedWord');
    }
    if (!isValidLegalName(name)) {
        return translate('privatePersonalDetails.error.hasInvalidCharacter');
    }
    if (name.length > CONST.LEGAL_NAME.MAX_LENGTH) {
        return translate('common.error.characterLimitExceedCounter', name.length, CONST.LEGAL_NAME.MAX_LENGTH);
    }
    return undefined;
}

export default getLegalNameError;
