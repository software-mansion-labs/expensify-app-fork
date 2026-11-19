import DatePicker from '@components/DatePicker';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import type {DateFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import CONST from '@src/CONST';

import {subYears} from 'date-fns';
import React, {useState} from 'react';

type DateFieldProps = {
    field: DateFieldConfig;
    shouldSaveDraft: boolean;
};

function DateField({field, shouldSaveDraft}: DateFieldProps) {
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
            minDate={field.maxAge === undefined ? undefined : subYears(today, field.maxAge)}
            maxDate={field.minAge === undefined ? undefined : subYears(today, field.minAge)}
            shouldSaveDraft={shouldSaveDraft}
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default DateField;
