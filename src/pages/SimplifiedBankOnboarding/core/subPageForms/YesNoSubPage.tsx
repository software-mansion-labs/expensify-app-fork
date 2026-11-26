/**
 * The block of a yes or no question. It wraps the shared YesNoStep with the form of the flow, saves the answer with the
 * values that come with it, sends the request for the answers that end the step, and moves to the page of the answer.
 */
import YesNoStep from '@components/SubStepForms/YesNoStep';

import type {BooleanInputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {NEXT_STEP} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';
import type {PageTarget, SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import React from 'react';

import RequestErrorMessage from './RequestErrorMessage';
import useSubPageSubmit from './useSubPageSubmit';

type YesNoSubPageProps = SubPageElementProps & {
    /** Where the answer is saved. Left out for a question whose answer only decides where to go */
    inputID?: BooleanInputID;

    title: string;
    description?: string;
    defaultValue: boolean;

    /** Where each answer leads. Default: `next` or the next page in order. */
    getNext?: (answer: boolean) => PageTarget;

    /** Values saved to the draft together with the answer (for example the owner list without the user) */
    getDraftUpdate?: (answer: boolean) => OnboardingDraft;

    /** Sent before the step ends, for the answers whose `getNext` or `next` is NEXT_STEP */
    request?: OnboardingRequest;
};

function YesNoSubPage({inputID, title, description, defaultValue, getNext, getDraftUpdate, request, next}: YesNoSubPageProps) {
    const {formID} = useOnboardingFlow();
    const {submit, isPending, errorMessage} = useSubPageSubmit({request});

    const submitAnswer = (answer: boolean) => {
        const target = getNext?.(answer) ?? next;
        submit({...(inputID ? {[inputID]: answer} : {}), ...getDraftUpdate?.(answer)}, target, {shouldSend: target === NEXT_STEP});
    };

    return (
        <YesNoStep
            title={title}
            description={description ?? ''}
            defaultValue={defaultValue}
            onSelectedValue={submitAnswer}
            formID={formID}
            enabledWhenOffline={!request}
            isLoading={isPending}
        >
            <RequestErrorMessage message={errorMessage} />
        </YesNoStep>
    );
}

export default YesNoSubPage;
export type {YesNoSubPageProps};
