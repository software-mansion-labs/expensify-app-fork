/**
 * The block of a sub page with inputs: a form of the flow with a title, the SubPageInput children, the required check,
 * the draft save on submit, the request of the page with its pending state and its error, and the move to the next page.
 */
import FormProvider from '@components/Form/FormProvider';
import type {FormInputErrors} from '@components/Form/types';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {PageTarget, SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import CONST from '@src/CONST';
import type ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import RequestErrorMessage from './RequestErrorMessage';
import useSubPageSubmit from './useSubPageSubmit';

/**
 * The errors of a page by input ID. Both forms of a flow hold their inputs under the input IDs of the main form, so the
 * errors are typed by the main form.
 */
type SubPageFormErrors = FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>;

type FormSubPageProps = SubPageElementProps & {
    title: string;
    description?: string;

    /** The inputs of this page. They go to the draft on submit. */
    inputIDs: InputID[];

    /** Errors by input ID. Every input in inputIDs is required unless `optionalInputIDs` names it. */
    validate?: (values: OnboardingDraft) => SubPageFormErrors;
    optionalInputIDs?: InputID[];

    request?: OnboardingRequest;

    /** Values added to the draft update on submit (control values that are not inputs) */
    getDraftUpdate?: (values: OnboardingDraft) => OnboardingDraft;

    /** Decides the next page from the submitted values. Default: `next` or the next page in order. */
    getNext?: (values: OnboardingDraft) => PageTarget;
    submitButtonText?: string;
    shouldHideFixErrorsAlert?: boolean;

    /** SubPageInput elements and any other markup */
    children: React.ReactNode;
};

/** The values of `inputIDs` in `values`, the draft update of a page */
function pickInputValues(values: OnboardingDraft, inputIDs: InputID[]): OnboardingDraft {
    const draftUpdate: OnboardingDraft = {};
    for (const inputID of inputIDs) {
        if (values[inputID] !== undefined) {
            Object.assign(draftUpdate, {[inputID]: values[inputID]});
        }
    }
    return draftUpdate;
}

function FormSubPage({
    title,
    description,
    inputIDs,
    validate,
    optionalInputIDs = [],
    request,
    getDraftUpdate,
    getNext,
    next,
    submitButtonText,
    shouldHideFixErrorsAlert = false,
    children,
}: FormSubPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {formID} = useOnboardingFlow();
    const {isEditing} = usePageNavigation();
    const {submit, isPending, errorMessage} = useSubPageSubmit({request});

    const validatePage = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {...validate?.(values)};
        for (const inputID of inputIDs) {
            if (!optionalInputIDs.includes(inputID) && !isRequiredFulfilled(values[inputID])) {
                errors[inputID] = translate('common.error.fieldRequired');
            }
        }
        return errors;
    };

    const submitPage = (values: OnboardingDraft) => {
        submit({...pickInputValues(values, inputIDs), ...getDraftUpdate?.(values)}, getNext?.(values) ?? next);
    };

    return (
        <FormProvider
            formID={formID}
            submitButtonText={submitButtonText ?? translate(isEditing ? 'common.confirm' : 'common.next')}
            validate={validatePage}
            onSubmit={submitPage}
            style={[styles.mh5, styles.flexGrow1]}
            enabledWhenOffline={!request}
            isLoading={isPending}
            shouldHideFixErrorsAlert={shouldHideFixErrorsAlert}
            footerContent={<RequestErrorMessage message={errorMessage} />}
            shouldRenderFooterAboveSubmit
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text style={styles.textHeadlineLineHeightXXL}>{title}</Text>
            {!!description && <Text style={[styles.pv3, styles.textSupporting]}>{description}</Text>}
            {children}
        </FormProvider>
    );
}

export default FormSubPage;
export type {FormSubPageProps, SubPageFormErrors};
