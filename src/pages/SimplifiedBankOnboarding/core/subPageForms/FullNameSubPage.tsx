/**
 * The block of a sub page with the legal first and last name. It wraps the shared FullNameStep, whose own check
 * requires both names and rejects invalid characters.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import type {OnboardingDraft, TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import React from 'react';

import ignorePageIndexMove from './ignorePageIndexMove';
import useSubPageSubmit from './useSubPageSubmit';

type FullNameSubPageProps = SubPageElementProps & {
    firstNameInputID: TextInputID;
    lastNameInputID: TextInputID;
    title: string;
    subtitle?: string;
    defaultValues: {firstName: string; lastName: string};
};

function FullNameSubPage({firstNameInputID, lastNameInputID, title, subtitle, defaultValues, next}: FullNameSubPageProps) {
    const {formID} = useOnboardingFlow();
    const {isEditing, goNext} = usePageNavigation();
    const {submit} = useSubPageSubmit({});

    return (
        <FullNameStep
            isEditing={isEditing}
            onNext={() => goNext()}
            onMove={ignorePageIndexMove}
            formID={formID}
            formTitle={title}
            formSubtitle={subtitle}
            onSubmit={(values: OnboardingDraft) => submit({[firstNameInputID]: values[firstNameInputID], [lastNameInputID]: values[lastNameInputID]}, next)}
            stepFields={[]}
            firstNameInputID={firstNameInputID}
            lastNameInputID={lastNameInputID}
            defaultValues={defaultValues}
            shouldShowHelpLinks={false}
        />
    );
}

export default FullNameSubPage;
export type {FullNameSubPageProps};
