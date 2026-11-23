import type {FlowPlan, FlowVocabulary} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import type {FlowPosition} from './position';

import {getPagePosition} from './position';
import {getStepLastPosition} from './transitions';

/**
 * Where the flow continues: the first page that is not complete in the first step that is not complete. A step whose
 * pages are all complete resumes at its last page, so the user confirms it. Undefined only for an empty plan.
 */
function getResumePosition<TVocabulary extends FlowVocabulary>(plan: FlowPlan<TVocabulary>): FlowPosition<TVocabulary> | undefined {
    const step = plan.steps.find((planStep) => !planStep.isComplete) ?? plan.steps.at(-1);
    if (!step) {
        return undefined;
    }
    const page = step.pages.find((stepPage) => !stepPage.isComplete);
    return page ? getPagePosition(step, page) : getStepLastPosition(step);
}

export default getResumePosition;
