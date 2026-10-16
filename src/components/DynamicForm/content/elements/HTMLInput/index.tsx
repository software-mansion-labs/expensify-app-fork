import DatePicker from '@components/DatePicker';
import DynamicFormInputRow from '@components/DynamicForm/content/elements/DynamicFormInputRow';
import {getRefreshHandlers} from '@components/DynamicForm/content/elements/inputBehavior';
import type {RefreshHandlers} from '@components/DynamicForm/content/elements/inputBehavior';
import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';
import InputWrapper from '@components/Form/InputWrapper';
import type {InputComponentBaseProps} from '@components/Form/types';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import ValuePicker from '@components/ValuePicker';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {ForwardedFSClassProps} from '@libs/Fullstory/types';
import getTextInputAutocorrectProps from '@libs/getTextInputAutocorrectProps';

import CONST from '@src/CONST';
import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

import React from 'react';

import {getHTMLInputChoices, isSensitiveHTMLInput} from './definition';

type HTMLInputProps = Pick<DynamicFormInputOptions, 'onRefreshRequirements'> & {
    element: DynamicFormHTMLInputElement;

    /** Current answers, which a typed answer reads when the user leaves the input */
    values: DynamicFormValues;
};

/** Props every HTML input passes to its InputWrapper */
type HTMLInputWrapperProps = Required<Pick<InputComponentBaseProps, 'inputID' | 'shouldSaveDraft'>> &
    Required<ForwardedFSClassProps> &
    RefreshHandlers & {
        /** Every Wise answer is a string, which each of the inputs takes */
        defaultValue?: string;
    };

/** A field in Wise's format, drawn by the plain input its `type` names. Each one behaves exactly as Wise describes it, refreshing the requirements as its only side effect. */
function HTMLInput({element, values, onRefreshRequirements}: HTMLInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const isSensitive = isSensitiveHTMLInput(element);
    const answer = values[element.key];
    const inputProps: HTMLInputWrapperProps = {
        inputID: element.key,
        shouldSaveDraft: !isSensitive,
        // A sensitive answer is not drafted, so a page the user comes back to is refilled from the answer kept in memory
        defaultValue: isSensitive && typeof answer === 'string' ? answer : undefined,
        forwardedFSClass: CONST.FULLSTORY.CLASS.MASK,
        ...getRefreshHandlers({inputID: element.key, shouldRefresh: !!element.refreshRequirementsOnChange, isTyped: element.type === 'text', values, onRefreshRequirements}),
    };

    switch (element.type) {
        case 'text':
            return (
                <DynamicFormInputRow>
                    <InputWrapper
                        InputComponent={TextInput}
                        {...inputProps}
                        label={element.name}
                        hint={element.example ? translate('dynamicForm.exampleHint', {example: element.example}) : undefined}
                        maxLength={element.maxLength ?? undefined}
                        {...getTextInputAutocorrectProps()}
                    />
                </DynamicFormInputRow>
            );
        case 'select':
            return (
                <DynamicFormInputRow isMenuRow>
                    <InputWrapper
                        InputComponent={ValuePicker}
                        {...inputProps}
                        label={element.name}
                        items={getHTMLInputChoices(element)}
                    />
                </DynamicFormInputRow>
            );
        case 'radio':
            return (
                <DynamicFormInputRow isMenuRow>
                    <Text style={[styles.mt3, styles.ph5]}>{element.name}</Text>
                    <InputWrapper
                        InputComponent={RadioButtons}
                        {...inputProps}
                        items={getHTMLInputChoices(element)}
                        accessibilityLabel={element.name}
                    />
                </DynamicFormInputRow>
            );
        case 'date':
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
        default: {
            const exhaustiveCheck: never = element.type;
            return exhaustiveCheck;
        }
    }
}

export default HTMLInput;
