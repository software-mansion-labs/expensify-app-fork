/**
 * A page of input fields. It renders the fields of the config inside the form of the flow, validates them with their
 * rules and submits only their values. What happens after the submit is up to the caller.
 */
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import FieldRenderer from '@pages/SimplifiedBankOnboarding/form/fields/FieldRenderer';
import type {FormPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getFieldValues from '@pages/SimplifiedBankOnboarding/formConfig/validation/getFieldValues';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/formConfig/validation/types';
import validateFields from '@pages/SimplifiedBankOnboarding/formConfig/validation/validateFields';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type FormPageProps = {
    /** The form that holds the values, which keeps the draft of the inputs while the user types */
    formID: OnboardingFormID;
    page: FormPageConfig;
    isEditing: boolean;
    isLoading: boolean;

    /** The error of the request that the submit started */
    errorText?: string;
    onSubmit: (values: OnboardingDraft) => void;
};

function FormPage({formID, page, isEditing, isLoading, errorText, onSubmit}: FormPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <FormProvider
            formID={formID}
            submitButtonText={page.submitLabel ?? translate(isEditing ? 'common.confirm' : 'common.next')}
            validate={(values, validateTranslate) => validateFields(page.fields, values, validateTranslate)}
            onSubmit={(values) => onSubmit(getFieldValues(page.fields, values))}
            style={[styles.mh5, styles.flexGrow1]}
            isLoading={isLoading}
            enabledWhenOffline={page.enabledWhenOffline}
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb5]}>{page.title}</Text>
            {!!page.description && <Text style={[styles.textSupporting, styles.mb5]}>{page.description}</Text>}
            {page.fields.map((field) => (
                <View
                    key={field.id}
                    style={styles.mb6}
                >
                    <FieldRenderer
                        formID={formID}
                        field={field}
                        shouldSaveDraft={!isEditing}
                    />
                </View>
            ))}
            <FormHelpMessage message={errorText} />
        </FormProvider>
    );
}

export default FormPage;
