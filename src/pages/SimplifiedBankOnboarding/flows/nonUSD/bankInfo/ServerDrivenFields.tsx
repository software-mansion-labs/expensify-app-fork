/**
 * A form page built from the bank inputs that the server described: a picklist for an input with a set of values, a
 * text input for the others, and the rules of each input. Both input pages of the bank step render it.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FormProvider from '@components/Form/FormProvider';
import PushRowWithModal from '@components/PushRowWithModal';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {SubPageInput, useOnboardingFlow, usePageNavigation, useSubPageSubmit} from '@pages/SimplifiedBankOnboarding/core';
import {useNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import {getBankFieldRuleError} from './bankFields';

type ServerDrivenFieldsProps = {
    title: string;

    /** The inputs of this page. The list is empty until the server described them. */
    fields: BankFormField[];
    isLoading: boolean;
};

function getPicklistOptions(field: BankFormField): Record<string, string> {
    return Object.fromEntries((field.valueSet ?? []).map((option) => [option.id, option.text]));
}

function ServerDrivenFields({title, fields, isLoading}: ServerDrivenFieldsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {formID} = useOnboardingFlow();
    const {isEditing} = usePageNavigation();
    const {bankFieldValues} = useNonUSDAnswers();
    const {submit} = useSubPageSubmit({});

    const validateFields = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {};
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

    const submitFields = (values: OnboardingDraft) => {
        const draftUpdate: OnboardingDraft = {};
        for (const field of fields) {
            draftUpdate[field.id] = values[field.id];
        }
        submit(draftUpdate);
    };

    const inputs = fields.map((field) => {
        if (field.valueSet) {
            return (
                <View
                    style={[styles.mb6, styles.mhn5]}
                    key={field.id}
                >
                    <SubPageInput
                        InputComponent={PushRowWithModal}
                        optionsList={getPicklistOptions(field)}
                        description={field.label}
                        defaultValue={bankFieldValues[field.id]}
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
                <SubPageInput
                    InputComponent={TextInput}
                    inputID={field.id}
                    label={field.label}
                    aria-label={field.label}
                    role={CONST.ROLE.PRESENTATION}
                    defaultValue={bankFieldValues[field.id]}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
                />
            </View>
        );
    });

    return (
        <FormProvider
            formID={formID}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            onSubmit={submitFields}
            validate={validateFields}
            style={[styles.mh5, styles.flexGrow1]}
            isSubmitDisabled={fields.length === 0}
            enabledWhenOffline
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

export default ServerDrivenFields;
export type {ServerDrivenFieldsProps};
