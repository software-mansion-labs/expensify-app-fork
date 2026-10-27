import getLocalizedText, {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';
import PercentageForm from '@components/PercentageForm';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

import type {DynamicFieldProps} from './types';

import FieldRow from './FieldRow';

function PercentField({field, inputProps}: DynamicFieldProps<'percent'>) {
    const {translate} = useLocalize();

    return (
        <FieldRow isDescriptionInInput>
            <InputWrapper
                InputComponent={PercentageForm}
                {...inputProps}
                label={getInputLabel(field, translate)}
                hint={getLocalizedText(translate, field.descriptionKey, field.description)}
            />
        </FieldRow>
    );
}

export default PercentField;
