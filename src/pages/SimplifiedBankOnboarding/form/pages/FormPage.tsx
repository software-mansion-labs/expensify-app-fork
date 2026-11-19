/**
 * A page of input fields. It renders the fields of the config inside the onboarding form, validates them with their
 * rules and submits only their values. What happens after the submit is up to the caller.
 */
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import FieldRenderer from '@pages/SimplifiedBankOnboarding/form/fields/FieldRenderer';
import type {OnboardingFormValues} from '@pages/SimplifiedBankOnboarding/form/types';
import getFieldValues from '@pages/SimplifiedBankOnboarding/form/validation/getFieldValues';
import validateFields from '@pages/SimplifiedBankOnboarding/form/validation/validateFields';
import type {FormPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

type FormPageProps = {
    page: FormPageConfig;
    isEditing: boolean;
    isLoading: boolean;

    /** The error of the request that the submit started */
    errorText?: string;
    onSubmit: (values: OnboardingDraft) => void;
};

function FormPage({page, isEditing, isLoading, errorText, onSubmit}: FormPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const submit = (values: OnboardingFormValues) => {
        onSubmit(getFieldValues(page.fields, values));
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={page.submitLabel ?? translate(isEditing ? 'common.confirm' : 'common.next')}
            validate={(values, validateTranslate) => validateFields(page.fields, values, validateTranslate)}
            onSubmit={submit}
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
