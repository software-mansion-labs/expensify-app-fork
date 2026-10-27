import DatePicker from '@components/DatePicker';
import getLocalizedText, {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';

import {subYears} from 'date-fns';
import React from 'react';

import type {DynamicFieldProps} from './types';

import FieldRow from './FieldRow';

function DateField({field, inputProps}: DynamicFieldProps<'date'>) {
    const {translate} = useLocalize();
    const isDateOfBirth = field.rule === 'dateOfBirth';

    return (
        <FieldRow
            field={field}
            isDescriptionInInput
        >
            <InputWrapper
                InputComponent={DatePicker}
                {...inputProps}
                label={getInputLabel(field, translate)}
                hint={getLocalizedText(translate, field.descriptionKey, field.description)}
                placeholder={translate('common.dateFormat')}
                // A date of birth can only be picked within the ages getDynamicFieldErrors accepts
                minDate={isDateOfBirth ? subYears(new Date(), CONST.DATE_BIRTH.MAX_AGE) : undefined}
                maxDate={isDateOfBirth ? subYears(new Date(), CONST.DATE_BIRTH.MIN_AGE_FOR_PAYMENT) : undefined}
            />
        </FieldRow>
    );
}

export default DateField;
