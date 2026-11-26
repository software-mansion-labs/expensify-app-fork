/**
 * The block of a sub page with one text input. It wraps the shared SingleFieldStep, so it looks like the one field
 * pages of the real flow.
 */
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import type {OnboardingDraft, TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import type {TranslationPaths} from '@src/languages/types';

import type {InputModeOptions} from 'react-native';

import React from 'react';

import type {SubPageFormErrors} from './FormSubPage';

import useSubPageSubmit from './useSubPageSubmit';

type SingleFieldSubPageProps = SubPageElementProps & {
    inputID: TextInputID;
    title: string;
    label: string;
    defaultValue: string;

    /** Checked after "required": the translation of the error, or undefined when the value is valid */
    validate?: (value: string) => TranslationPaths | undefined;
    inputMode?: InputModeOptions;
    maxLength?: number;
    placeholder?: string;

    /** A line of text under the title */
    hint?: string;

    /** Disables the input, which then shows defaultValue */
    isLocked?: boolean;
};

function SingleFieldSubPage({inputID, title, label, defaultValue, validate, inputMode, maxLength, placeholder, hint, isLocked = false, next}: SingleFieldSubPageProps) {
    const {translate} = useLocalize();
    const {formID} = useOnboardingFlow();
    const {isEditing} = usePageNavigation();
    const {submit} = useSubPageSubmit({});

    const validateField = (values: OnboardingDraft): SubPageFormErrors => {
        const value = values[inputID] ?? '';
        if (!isRequiredFulfilled(value)) {
            return {[inputID]: translate('common.error.fieldRequired')};
        }
        const errorPath = validate?.(value);
        return errorPath ? {[inputID]: translate(errorPath)} : {};
    };

    return (
        <SingleFieldStep
            isEditing={isEditing}
            formID={formID}
            formTitle={title}
            formDisclaimer={hint}
            validate={validateField}
            onSubmit={(values: OnboardingDraft) => submit({[inputID]: values[inputID]}, next)}
            inputId={inputID}
            inputLabel={label}
            inputMode={inputMode}
            defaultValue={defaultValue}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={isLocked}
            shouldShowHelpLinks={false}
            enabledWhenOffline
            shouldDelayAutoFocus
        />
    );
}

export default SingleFieldSubPage;
export type {SingleFieldSubPageProps};
