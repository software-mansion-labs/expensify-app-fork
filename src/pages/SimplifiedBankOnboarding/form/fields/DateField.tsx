import DatePicker from '@components/DatePicker';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import type {DateFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import CONST from '@src/CONST';

import {subYears} from 'date-fns';
import React, {useState} from 'react';

type DateFieldProps = {
    field: DateFieldConfig;
};

function DateField({field}: DateFieldProps) {
    const {translate} = useLocalize();
    // The age bounds are measured from the day the page opened, so a render never moves them
    const [today] = useState(() => new Date());

    return (
        <InputWrapper
            InputComponent={DatePicker}
            inputID={field.id}
            label={field.label}
            placeholder={translate('common.dateFormat')}
            defaultValue={field.defaultValue}
            minDate={field.isDateOfBirth ? subYears(today, CONST.DATE_BIRTH.MAX_AGE) : undefined}
            maxDate={field.isDateOfBirth ? subYears(today, CONST.DATE_BIRTH.MIN_AGE_FOR_PAYMENT) : undefined}
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default DateField;
