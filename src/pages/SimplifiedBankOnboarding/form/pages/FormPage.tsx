/**
 * A page of input fields. It renders the fields of the plan inside the form of the flow, validates them with the rules
 * of the page and submits only the values of its inputs. What happens after the submit is up to the caller.
 */
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import OnboardingFormIDContext from '@pages/SimplifiedBankOnboarding/form/fields/OnboardingFormIDContext';
import type {FormPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getInputValues from '@pages/SimplifiedBankOnboarding/formConfig/validation/getInputValues';
import validateInputs from '@pages/SimplifiedBankOnboarding/formConfig/validation/validateInputs';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/types/formID';

import CONST from '@src/CONST';

import React from 'react';

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
        <OnboardingFormIDContext.Provider value={formID}>
            <FormProvider
                formID={formID}
                submitButtonText={page.submitLabel ?? translate(isEditing ? 'common.confirm' : 'common.next')}
                validate={(values, validateTranslate) => validateInputs(page.inputs, values, validateTranslate)}
                onSubmit={(values) => onSubmit(getInputValues(page.inputs, values))}
                style={[styles.mh5, styles.flexGrow1]}
                isLoading={isLoading}
                enabledWhenOffline={page.enabledWhenOffline}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
            >
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mb5]}>{page.title}</Text>
                {!!page.description && <Text style={[styles.textSupporting, styles.mb5]}>{page.description}</Text>}
                {page.content}
                <FormHelpMessage message={errorText} />
            </FormProvider>
        </OnboardingFormIDContext.Provider>
    );
}

export default FormPage;
