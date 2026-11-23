/**
 * The first and last name inputs of a person, such as the user or a beneficial owner. The confirmation of the step shows
 * them as one full name.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {doesContainReservedWord, isValidLegalName} from '@libs/ValidationUtils';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';

import CONST from '@src/CONST';

import React from 'react';

import type {Field} from './types';

import createTextField from './createTextField';

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

function createLegalNameField(firstNameID: TextInputID, lastNameID: TextInputID): Field {
    // The labels and the errors need the language, which only the caller of a field knows
    const getNameFields = (translate: LocalizedTranslate) => {
        const validate = (value: string) => getLegalNameError(value, translate);
        return {
            firstName: createTextField(firstNameID, {label: translate('personalInfoStep.legalFirstName'), validate}),
            lastName: createTextField(lastNameID, {label: translate('personalInfoStep.legalLastName'), validate}),
        };
    };

    return {
        key: `${firstNameID}-${lastNameID}`,
        inputIDs: [firstNameID, lastNameID],

        getErrors: (values, translate) => {
            const {firstName, lastName} = getNameFields(translate);
            return {...firstName.getErrors(values, translate), ...lastName.getErrors(values, translate)};
        },

        getSummaryRows: (values, translate) => [
            {
                id: firstNameID,
                label: translate('personalInfoStep.legalName'),
                value: `${values[firstNameID] ?? ''} ${values[lastNameID] ?? ''}`.trim(),
            },
        ],

        render: (context) => {
            const {firstName, lastName} = getNameFields(context.translate);
            return (
                <>
                    {firstName.render(context)}
                    {lastName.render(context)}
                </>
            );
        },
    };
}

export default createLegalNameField;
