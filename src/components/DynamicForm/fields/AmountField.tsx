import AmountForm from '@components/AmountForm';
import CurrencyPicker from '@components/CurrencyPicker';
import {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

import type {DynamicFieldProps} from './types';

import {useDynamicFieldContext} from './DynamicFieldContext';
import FieldRow from './FieldRow';

/** A money amount, with a currency picker above it when the schema lets the user choose the currency */
function AmountField({field, inputProps}: DynamicFieldProps<'amount'>) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {values, currency} = useDynamicFieldContext();
    const chosenCurrency = field.currencyKey ? values[field.currencyKey] : undefined;
    const amountCurrency = typeof chosenCurrency === 'string' && chosenCurrency !== '' ? chosenCurrency : currency;

    return (
        <FieldRow>
            {!!field.currencyKey && (
                <View style={[styles.mhn5, styles.mb2]}>
                    <InputWrapper
                        InputComponent={CurrencyPicker}
                        inputID={field.currencyKey}
                        shouldSaveDraft={inputProps.shouldSaveDraft}
                        forwardedFSClass={inputProps.forwardedFSClass}
                        // A sensitive currency is not drafted, so the picker starts from the one kept in memory
                        defaultValue={amountCurrency}
                        label={translate('common.currency')}
                        accessibilityLabel={`${translate('common.currency')}, ${getFieldLabel(field, translate)}`}
                        shouldReadErrorWithLabel
                    />
                </View>
            )}
            {/* AmountForm takes no FullStory class, so the mask goes on a View around it */}
            <View fsClass={inputProps.forwardedFSClass}>
                <InputWrapper
                    InputComponent={AmountForm}
                    {...inputProps}
                    label={getInputLabel(field, translate)}
                    currency={amountCurrency}
                    displayAsTextInput
                    isCurrencyPressable={false}
                />
            </View>
        </FieldRow>
    );
}

export default AmountField;
