/**
 * A form built from the inputs that the server described: a text input for a plain field, a picklist for a field with a
 * set of values, and a validator that runs the rules of each field. Both input sub pages of the bank step render it.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import PushRowWithModal from '@components/PushRowWithModal';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import type {BankFieldID, BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getBankFieldRuleError} from '@pages/SimplifiedBankOnboarding/utils/BankFieldUtils';
import type {ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

type ServerDrivenFieldsFormProps = {
    title: string;

    /** The inputs to render. The list is empty until the server has described them. */
    fields: BankFormField[];

    /** The values of every bank input that the step resolved */
    defaultValues: ResolvedValues<BankFieldID>;
    isLoading: boolean;
    isEditing: boolean;
    onNext: () => void;
};

function getPicklistOptions(field: BankFormField): Record<string, string> {
    return Object.fromEntries((field.valueSet ?? []).map((option) => [option.id, option.text]));
}

function ServerDrivenFieldsForm({title, fields, defaultValues, isLoading, isEditing, onNext}: ServerDrivenFieldsFormProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const fieldIds = fields.map((field) => field.id);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> = {};
        for (const field of fields) {
            const value = values[field.id];
            if (!value) {
                if (field.isRequired) {
                    errors[field.id] = translate('common.error.fieldRequired');
                }
                continue;
            }
            const ruleError = getBankFieldRuleError(field, value);
            if (ruleError) {
                errors[field.id] = ruleError;
            }
        }
        return errors;
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds, onNext, shouldSaveDraft: true});

    const inputs = fields.map((field) => {
        const defaultValue = defaultValues[field.id];
        if (field.valueSet) {
            return (
                <View
                    style={[styles.mb6, styles.mhn5]}
                    key={field.id}
                >
                    <InputWrapper
                        InputComponent={PushRowWithModal}
                        optionsList={getPicklistOptions(field)}
                        description={field.label}
                        shouldSaveDraft={!isEditing}
                        defaultValue={defaultValue}
                        modalHeaderTitle={field.label}
                        searchInputTitle={field.label}
                        inputID={field.id}
                    />
                </View>
            );
        }
        return (
            <View
                style={styles.mb6}
                key={field.id}
            >
                <InputWrapper
                    InputComponent={TextInput}
                    inputID={field.id}
                    label={field.label}
                    aria-label={field.label}
                    role={CONST.ROLE.PRESENTATION}
                    shouldSaveDraft={!isEditing}
                    defaultValue={defaultValue}
                />
            </View>
        );
    });

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            onSubmit={handleSubmit}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            isSubmitDisabled={fields.length === 0}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb6]}>{title}</Text>
            {isLoading ? (
                <View style={[styles.flexGrow4, styles.alignItemsCenter]}>
                    <ActivityIndicator
                        size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE}
                        style={styles.flexGrow1}
                    />
                </View>
            ) : (
                inputs
            )}
        </FormProvider>
    );
}

export default ServerDrivenFieldsForm;
