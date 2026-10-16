import DatePicker from '@components/DatePicker';
import DynamicFormInputRow from '@components/DynamicForm/components/DynamicFormInputRow';
import type {HTMLInputOfTypeProps} from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

/** A calendar date, stored as yyyy-MM-dd */
function HTMLDateInput({element, inputProps}: HTMLInputOfTypeProps) {
    const {translate} = useLocalize();

    return (
        <DynamicFormInputRow>
            <InputWrapper
                InputComponent={DatePicker}
                {...inputProps}
                label={element.name}
                placeholder={translate('common.dateFormat')}
            />
        </DynamicFormInputRow>
    );
}

export default HTMLDateInput;
