/**
 * A page of input fields. It renders the fields of the plan inside the form of the flow, validates them with their own
 * rules and submits only the values of their inputs. What happens after the submit is up to the caller.
 */
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/formID';
import {getFieldValues, validateFields} from '@pages/SimplifiedBankOnboarding/core/form/fields/fieldSet';
import type {FormPageConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import CONST from '@src/CONST';

import React from 'react';

type FormPageProps = {
    /** The form that holds the values, which keeps the draft of the inputs while the user types */
    formID: OnboardingFormID;
    page: FormPageConfig;

    /** The answers of the flow, where each field finds the value it starts with */
    answers: OnboardingDraft;
    isEditing: boolean;

    /** The submit sends no request, so it only writes the draft and works without a connection */
    canSubmitOffline: boolean;
    isLoading: boolean;

    /** The error of the request that the submit started */
    errorText?: string;
    onSubmit: (values: OnboardingDraft) => void;
};

function FormPage({formID, page, answers, isEditing, canSubmitOffline, isLoading, errorText, onSubmit}: FormPageProps) {
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
            enabledWhenOffline={canSubmitOffline}
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb5]}>{page.title}</Text>
            {!!page.description && <Text style={[styles.textSupporting, styles.mb5]}>{page.description}</Text>}
            {page.fields.map((field) => (
                <React.Fragment key={field.key}>{field.render({values: answers, translate})}</React.Fragment>
            ))}
            <FormHelpMessage message={errorText} />
        </FormProvider>
    );
}

export default FormPage;
