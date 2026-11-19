/**
 * The screen body of a flow: the header with the step counter and the open page of the plan. The flow descriptor
 * supplies the plan and the custom steps, so the same page serves every flow.
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import PageRenderer from '@pages/SimplifiedBankOnboarding/form/pages/PageRenderer';
import type {CustomPageConfig, PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {FlowRouteParams, FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import React from 'react';

import type {FlowDescriptor} from './types';

import useOnboardingFlow from './useOnboardingFlow';

type OnboardingFlowPageProps = {
    flow: FlowDescriptor;
    target: FlowRouteTarget;
    routeParams: FlowRouteParams;
};

/** Only the last page of a step sends its request, so only that page shows the spinner and the error of the request */
function isLastPageOfStep(step: StepConfig, page: PageConfig): boolean {
    return step.pages.at(-1)?.id === page.id;
}

function OnboardingFlowPage({flow, target, routeParams}: OnboardingFlowPageProps) {
    const {data, step, page, position, isSubmitting, errorText, submitPage, goBack, editPage, pressRow, goToStep} = useOnboardingFlow(flow, target, routeParams);

    if (!step || !page || !position) {
        return <FullScreenLoadingIndicator />;
    }

    const isRequestPage = isLastPageOfStep(step, page);

    const renderCustom = (customPage: CustomPageConfig) =>
        flow.renderCustomStep({
            page: customPage,
            policyID: target.policyID ?? data.account?.achData?.policyID,
            isSubmitting,
            errorText: errorText || undefined,
            onComplete: (values) => submitPage(values ?? {}),
            goToStep,
        });

    return (
        <InteractiveStepWrapper
            wrapperID={flow.wrapperID}
            headerTitle={step.title}
            handleBackButtonPress={goBack}
            startStepIndex={step.counterIndex}
            stepNames={step.counterIndex === undefined ? undefined : flow.getStepNames(data)}
            shouldEnableMaxHeight
            shouldRemountSubHeaderOnStepChange
        >
            <PageRenderer
                page={page}
                isEditing={position.isEditing}
                isLoading={isRequestPage && isSubmitting}
                errorText={isRequestPage && errorText ? errorText : undefined}
                onSubmit={submitPage}
                onEdit={editPage}
                onRowPress={pressRow}
                renderCustom={renderCustom}
            />
        </InteractiveStepWrapper>
    );
}

export default OnboardingFlowPage;
