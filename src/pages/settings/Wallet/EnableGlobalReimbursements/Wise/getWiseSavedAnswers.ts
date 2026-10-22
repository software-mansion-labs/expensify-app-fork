import type {DynamicFormValues} from '@components/DynamicForm/types';
import getContentFields from '@components/DynamicForm/utils/getContentFields';
import isSupportedField from '@components/DynamicForm/utils/isSupportedField';

import type {WiseBusinessOnboarding} from '@src/types/onyx/ReimbursementAccount';

import {deepEqual} from 'fast-equals';

import KYC_REQUIREMENT_LAYOUTS from './kycRequirementLayouts';

/** Answers to the requirement pages the App draws, which the server keeps by requirement type. Their files come back only as storage keys, so they are asked again. */
function getSavedRequirementAnswers(requirements: WiseBusinessOnboarding['requirements']): DynamicFormValues {
    const answers: DynamicFormValues = {};
    for (const [requirementKey, page] of Object.entries(KYC_REQUIREMENT_LAYOUTS)) {
        const savedRequirement = requirements?.[requirementKey];
        if (!page || !savedRequirement) {
            continue;
        }
        for (const field of getContentFields(page.content).filter(isSupportedField)) {
            const answer = savedRequirement[field.key];
            if (field.type !== 'file' && typeof answer === 'string') {
                answers[field.key] = answer;
            }
        }
    }
    return answers;
}

/**
 * The onboarding answers the server holds, under the form's field keys. The representative's details are saved to the user's private personal details,
 * which the prefill reads, and the SSN and the ID files never come back.
 */
function getWiseSavedAnswers(wise: WiseBusinessOnboarding | undefined): DynamicFormValues {
    const business = wise?.business;
    return {
        ...(business ? {companyRole: business.companyRole, industryCategories: business.industryCategories, description: business.description} : {}),
        ...getSavedRequirementAnswers(wise?.requirements),
    };
}

/** The saved answers the draft does not match. What the server saved wins, since it may come from another device. */
function getOutdatedDraftAnswers(savedAnswers: DynamicFormValues, draft: DynamicFormValues): DynamicFormValues {
    return Object.fromEntries(Object.entries(savedAnswers).filter(([key, answer]) => answer !== undefined && !deepEqual(draft[key], answer)));
}

export default getWiseSavedAnswers;
export {getOutdatedDraftAnswers};
