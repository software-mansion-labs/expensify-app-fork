/**
 * Builds a form page. The page counts as complete when the answers pass the rules of its fields, so the resume position
 * and the step counter agree with what the user sees. A page whose completeness the server decides passes it instead.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {areFieldsComplete} from '@pages/SimplifiedBankOnboarding/form/fields/fieldSet';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import type {FormPageConfig} from './types';

type FormPageDefinition = Omit<FormPageConfig, 'kind' | 'isComplete'> & {
    isComplete?: boolean;
};

function getFormPage(definition: FormPageDefinition, answers: OnboardingDraft, translate: LocalizedTranslate): FormPageConfig {
    return {
        ...definition,
        kind: 'form',
        isComplete: definition.isComplete ?? areFieldsComplete(definition.fields, answers, translate),
    };
}

export default getFormPage;
export type {FormPageDefinition};
