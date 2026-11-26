/**
 * The block of a sub page with a date of birth. It wraps the shared DateOfBirthStep, whose own check rejects a date
 * outside the allowed ages. Only the main form holds a date of birth.
 */
import DateOfBirthStep from '@components/SubStepForms/DateOfBirthStep';

import type {OnboardingDraft, TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import useSubPageSubmit from './useSubPageSubmit';

type DateOfBirthSubPageProps = SubPageElementProps & {
    inputID: TextInputID;
    title: string;
    defaultValue: string;
};

function DateOfBirthSubPage({inputID, title, defaultValue, next}: DateOfBirthSubPageProps) {
    const {formID} = useOnboardingFlow();
    const {isEditing} = usePageNavigation();
    const {submit} = useSubPageSubmit({});

    if (formID !== ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM) {
        throw new Error('DateOfBirthSubPage works only in a flow of the main form');
    }

    return (
        <DateOfBirthStep
            isEditing={isEditing}
            formID={formID}
            formTitle={title}
            onSubmit={(values: OnboardingDraft) => submit({[inputID]: values[inputID]}, next)}
            stepFields={[inputID]}
            dobInputID={inputID}
            dobDefaultValue={defaultValue}
        />
    );
}

export default DateOfBirthSubPage;
export type {DateOfBirthSubPageProps};
