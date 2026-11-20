/**
 * Builds the next and back handlers that a flow page passes to its current step, and the handler that leaves the flow. The flow definition picks the target
 * step and its sub page, and the flow page only says how a position becomes a route.
 */
import Navigation from '@libs/Navigation/Navigation';

import type {Route} from '@src/ROUTES';

import type {FlowContext, FlowDefinition, FlowPosition, StepDefinition} from './types';

import {getEntryPosition, getNextStep, getPreviousStep} from './flowNavigation';

type FlowNavigationParams<TPageName extends string> = {
    flow: FlowDefinition<TPageName>;
    context: FlowContext;
    currentStep: StepDefinition<TPageName>;

    /** Builds the route of a position in this flow */
    getRoute: (position: FlowPosition<TPageName>) => Route;

    /** Where the flow returns when a step leaves it */
    backTo?: Route;
};

function getFlowNavigationHandlers<TPageName extends string>({flow, context, currentStep, getRoute, backTo}: FlowNavigationParams<TPageName>) {
    const goToNextPage = () => {
        const nextStep = getNextStep(flow, context, currentStep.id);
        if (!nextStep) {
            Navigation.goBack();
            return;
        }
        Navigation.navigate(getRoute(getEntryPosition(nextStep, context, 'forward')));
    };

    const leaveFlow = () => {
        if (backTo) {
            Navigation.goBack(backTo);
            return;
        }
        Navigation.dismissModal();
    };

    const goToPreviousPage = () => {
        if (currentStep.leavesFlowOnBack?.(context)) {
            leaveFlow();
            return;
        }

        const previousStep = getPreviousStep(flow, context, currentStep.id);
        if (!previousStep) {
            Navigation.goBack();
            return;
        }
        Navigation.goBack(getRoute(getEntryPosition(previousStep, context, 'backward')));
    };

    return {goToNextPage, goToPreviousPage, leaveFlow};
}

export default getFlowNavigationHandlers;
