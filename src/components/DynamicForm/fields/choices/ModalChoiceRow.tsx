import FieldRow from '@components/DynamicForm/fields/FieldRow';
import type {DynamicFieldInputProps} from '@components/DynamicForm/fields/types';
import InputWrapper from '@components/Form/InputWrapper';
import PushRowWithModal from '@components/PushRowWithModal';
import type {Choice} from '@components/RadioButtons';

import React from 'react';

import getChoiceOptionsList from './getChoiceOptionsList';

type ModalChoiceRowProps = {
    /** Heads the modal and names its search input */
    title: string;

    /** Describes the row */
    label: string;
    choices: Choice[];
    inputProps: DynamicFieldInputProps<string>;
};

/** A row that opens the options in a searchable modal, for lists too long to show in place */
function ModalChoiceRow({title, label, choices, inputProps}: ModalChoiceRowProps) {
    return (
        <FieldRow isMenuRow>
            <InputWrapper
                InputComponent={PushRowWithModal}
                {...inputProps}
                optionsList={getChoiceOptionsList(choices)}
                description={label}
                modalHeaderTitle={title}
                searchInputTitle={title}
            />
        </FieldRow>
    );
}

export default ModalChoiceRow;
