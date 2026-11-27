/**
 * A form page built from the bank inputs that the server described: a picklist for an input with a set of values, a
 * text input for the others, and the rules of each input. Both input pages of the bank step render it.
 */
import PushRowWithModal from '@components/PushRowWithModal';
import TextInput from '@components/TextInput';

import useThemeStyles from '@hooks/useThemeStyles';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {FormSubPage, SubPageInput, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import {getBankFieldRuleError} from './bankFields';
import getBankInfoAnswers from './getBankInfoAnswers';

type ServerDrivenFieldsProps = {
    title: string;
    fields: BankFormField[];
};

function getPicklistOptions(field: BankFormField): Record<string, string> {
    return Object.fromEntries((field.valueSet ?? []).map((option) => [option.id, option.text]));
}

function ServerDrivenFields({title, fields}: ServerDrivenFieldsProps) {
    const styles = useThemeStyles();
    const {bankFieldValues} = getBankInfoAnswers(useFlowData());

    const validateRules = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {};
        for (const field of fields) {
            const value = values[field.id];
            const ruleError = value ? getBankFieldRuleError(field, value) : undefined;
            if (ruleError) {
                errors[field.id] = ruleError;
            }
        }
        return errors;
    };

    const inputs = fields.map((field) => {
        if (field.valueSet) {
            return (
                <View
                    style={[styles.mt6, styles.mhn5]}
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
                style={styles.mt6}
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
        <FormSubPage
            title={title}
            inputIDs={fields.map((field) => field.id)}
            optionalInputIDs={fields.filter((field) => !field.isRequired).map((field) => field.id)}
            validate={validateRules}
        >
            {inputs}
        </FormSubPage>
    );
}

export default ServerDrivenFields;
export type {ServerDrivenFieldsProps};
