import type {DynamicFormLayout} from '@components/DynamicForm/types';

import CONST from '@src/CONST';

import {useState} from 'react';

import type {FlowPages} from './getFlowPages';
import type {DynamicFormFlowPage} from './types';

type StepIndicatorOptions = Pick<FlowPages, 'shownPages' | 'hasConfirmationPage'> & {
    layout: DynamicFormLayout;

    /** The page whose step is highlighted. Without one, the last step is. */
    stepPage: DynamicFormFlowPage | undefined;

    isDraftLoading: boolean;
};

type StepIndicator = {
    stepNames: string[];
    stepIndex: number;
    shouldShowStepIndicator: boolean;
};

/** One step per shown page, then one for the confirmation page */
function useStepIndicator({shownPages, hasConfirmationPage, layout, stepPage, isDraftLoading}: StepIndicatorOptions): StepIndicator {
    // The indicator draws no names and keys its steps by them, so the unique page keys stand in for titles an untitled page does not have
    const stepNames = [...shownPages.map((page) => page.key), ...(hasConfirmationPage ? [CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY] : [])];
    const stepPageIndex = stepPage ? shownPages.indexOf(stepPage) : -1;

    // The shell swaps its root when the indicator toggles, which remounts the page. So `auto` decides once, from the answers the draft held on arrival, and keeps it while the user types.
    const [isAutoStepIndicatorAsked, setIsAutoStepIndicatorAsked] = useState<boolean>();
    if (!isDraftLoading && isAutoStepIndicatorAsked === undefined) {
        setIsAutoStepIndicatorAsked(shownPages.length >= CONST.DYNAMIC_FORM.STEP_INDICATOR_MIN_PAGES);
    }
    const isStepIndicatorAsked = layout === 'auto' ? !!isAutoStepIndicatorAsked : layout === 'stepper';

    return {
        stepNames,
        stepIndex: stepPageIndex === -1 ? stepNames.length - 1 : stepPageIndex,
        shouldShowStepIndicator: isStepIndicatorAsked && stepNames.length > 1,
    };
}

export default useStepIndicator;
