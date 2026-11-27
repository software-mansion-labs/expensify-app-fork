/**
 * Builds a form page. The page counts as complete when the answers pass the rules of its fields, so the resume position
 * and the step counter agree with what the user sees. A page whose completeness the server decides passes it instead.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {areFieldsComplete} from '@pages/SimplifiedBankOnboarding/core/form/fields/fieldSet';

import type {FlowVocabulary, FormPageConfig} from './types';

type FormPageDefinition<TVocabulary extends FlowVocabulary = FlowVocabulary> = Omit<FormPageConfig<TVocabulary>, 'kind' | 'isComplete'> & {
    isComplete?: boolean;
};

function getFormPage<TVocabulary extends FlowVocabulary>(definition: FormPageDefinition<TVocabulary>, answers: OnboardingDraft, translate: LocalizedTranslate): FormPageConfig<TVocabulary> {
    return {
        ...definition,
        kind: 'form',
        isComplete: definition.isComplete ?? areFieldsComplete(definition.fields, answers, translate),
    };
}

export default getFormPage;
export type {FormPageDefinition};
