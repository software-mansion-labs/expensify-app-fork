/**
 * The yes or no pages of the plan, such as the owner questions. It renders them with the shared yes or no step and
 * saves the answer to one boolean input.
 */
import FormHelpMessage from '@components/FormHelpMessage';
import YesNoStep from '@components/SubStepForms/YesNoStep';

import useThemeStyles from '@hooks/useThemeStyles';

import type {QuestionPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {BooleanInputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import React from 'react';

type QuestionPageProps = {
    page: QuestionPageConfig;
    isLoading: boolean;

    /** The error of the request that the submit started */
    errorText?: string;
    onSubmit: (values: OnboardingDraft) => void;
};

function getAnswer(fieldID: BooleanInputID, value: boolean): OnboardingDraft {
    const answer: OnboardingDraft = {};
    answer[fieldID] = value;
    return answer;
}

/** A yes or no question that submits its answer as the value of one input */
function QuestionPage({page, isLoading, errorText, onSubmit}: QuestionPageProps) {
    const styles = useThemeStyles();

    return (
        <YesNoStep
            title={page.title}
            description={page.description}
            defaultValue={page.defaultValue}
            onSelectedValue={(value) => onSubmit(getAnswer(page.fieldID, value))}
            isLoading={isLoading}
            submitButtonStyles={styles.mb0}
        >
            <FormHelpMessage
                style={[styles.mh5, styles.mt3]}
                message={errorText}
            />
        </YesNoStep>
    );
}

export default QuestionPage;
