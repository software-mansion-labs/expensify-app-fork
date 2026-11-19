/**
 * The screen body of a flow: the header with the step counter and the open page of the plan. The flow descriptor
 * supplies the plan and the custom steps, so the same page serves every flow.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useThemeStyles from '@hooks/useThemeStyles';

import PageRenderer from '@pages/SimplifiedBankOnboarding/form/pages/PageRenderer';
import type {CustomPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {FlowRouteParams, FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import type {FlowDescriptor} from './types';

import useOnboardingFlow from './useOnboardingFlow';

type OnboardingFlowPageProps = {
    flow: FlowDescriptor;
    target: FlowRouteTarget;
    routeParams: FlowRouteParams;
};

function OnboardingFlowPage({flow, target, routeParams}: OnboardingFlowPageProps) {
    const styles = useThemeStyles();
    const {data, context, step, page, position, isSubmitting, errorText, submitPage, goBack, editPage, pressRow, goToStep} = useOnboardingFlow(flow, target, routeParams);

    if (!step || !page || !position) {
        return <FullScreenLoadingIndicator />;
    }

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
            stepNames={step.counterIndex === undefined ? undefined : flow.getStepNames(data, context)}
            shouldEnableMaxHeight
            shouldRemountSubHeaderOnStepChange
        >
            {page.isLoading ? (
                <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            ) : (
                <PageRenderer
                    page={page}
                    isEditing={position.isEditing}
                    isLoading={isSubmitting}
                    errorText={errorText || undefined}
                    onSubmit={submitPage}
                    onEdit={editPage}
                    onRowPress={pressRow}
                    renderCustom={renderCustom}
                />
            )}
        </InteractiveStepWrapper>
    );
}

export default OnboardingFlowPage;
