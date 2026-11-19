import type {FlowPlan} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import type {FlowPosition} from './position';

import {comparePositionIndexes, getPositionIndex} from './position';
import getResumePosition from './resume';

/**
 * A position may be opened when the plan has it and it does not come after the resume position, so a typed or stale
 * URL cannot skip a page that still needs an answer.
 */
function isPositionReachable(plan: FlowPlan, position: FlowPosition | undefined): position is FlowPosition {
    if (!position) {
        return false;
    }
    const positionIndex = getPositionIndex(plan, position);
    const resumePosition = getResumePosition(plan);
    const resumeIndex = resumePosition ? getPositionIndex(plan, resumePosition) : undefined;
    if (!positionIndex || !resumeIndex) {
        return false;
    }
    return comparePositionIndexes(positionIndex, resumeIndex) <= 0;
}

export default isPositionReachable;
