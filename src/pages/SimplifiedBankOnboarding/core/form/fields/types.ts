/**
 * A field of a form page: the inputs it owns, their rules, the rows that the confirmation of the step shows for them and
 * the way they render. The pages, the plans and the controller know only this shape, so a new kind of field is one new
 * file in this folder.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormErrors} from '@pages/SimplifiedBankOnboarding/contract/formID';

import type {ReactNode} from 'react';

/**
 * Returns the translated error of a value, or undefined when the value is valid. The other values of the form are there
 * for the rules that compare two inputs, such as two emails that must differ.
 */
type FieldValidator = (value: string, values: OnboardingDraft) => string | undefined;

/** How a field checks one of its inputs. An input is required unless it is optional. */
type InputRule = {
    isOptional?: boolean;

    /** The error of an empty required input. The generic "field required" error is shown without it. */
    requiredErrorText?: string;

    /** Only a text value is checked, and only once the required check passed */
    validate?: FieldValidator;
};

type SummaryRow = {
    id: string;
    label: string;
    value: string;
};

type FieldRenderContext = {
    /** The answers of the flow, where an input finds the value it starts with */
    values: OnboardingDraft;
    translate: LocalizedTranslate;
};

type Field = {
    /** The React key of the field on its page */
    key: string;

    /** The page validates and submits these inputs, and the draft drops them once the server saved the step */
    inputIDs: InputID[];

    /** The errors of the inputs, keyed by input ID. The page shows them and counts as complete without any. */
    getErrors: (values: OnboardingDraft, translate: LocalizedTranslate) => OnboardingFormErrors;

    /** The rows of the field on the confirmation of its step. A field without them is left out of the confirmation. */
    getSummaryRows?: (values: OnboardingDraft, translate: LocalizedTranslate) => SummaryRow[];

    /** The server never returns the value, such as a file, so the draft keeps it after the step is saved */
    shouldKeepInDraft?: boolean;
    render: (context: FieldRenderContext) => ReactNode;
};

export type {Field, FieldRenderContext, FieldValidator, InputRule, SummaryRow};
