/**
 * The screen body of a flow: the header with the step counter and the open page of the plan. The flow descriptor
 * supplies the form, the plan and the custom steps, so the same page serves every flow.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useThemeStyles from '@hooks/useThemeStyles';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import PageRenderer from '@pages/SimplifiedBankOnboarding/form/pages/PageRenderer';
import type {FlowRouteParams, FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import type {FlowDataSource, FlowDataStatus, FlowDescriptor} from './types';

import useOnboardingFlow from './useOnboardingFlow';

type OnboardingFlowPageProps<TData> = {
    flow: FlowDescriptor<TData>;
    target: FlowRouteTarget;
    routeParams: FlowRouteParams;
    dataSource: FlowDataSource<TData>;

    /** Whether the data of the plan is there. The page shows a loader until it is. */
    dataStatus: FlowDataStatus;
};

function OnboardingFlowPage<TData>({flow, target, routeParams, dataSource, dataStatus}: OnboardingFlowPageProps<TData>) {
    const styles = useThemeStyles();
    const {data, context, step, page, position, isSubmitting, errorText, submitPage, goBack, editPage, pressRow, goToStep} = useOnboardingFlow({
        flow,
        target,
        routeParams,
        dataSource,
        dataStatus,
    });

    if (dataStatus === 'notFound') {
        return <NotFoundPage />;
    }

    // Until the data is there, and while the redirect from a URL without a reachable position lands
    if (dataStatus === 'loading' || !step || !page || !position) {
        return <FullScreenLoadingIndicator onGoBack={goBack} />;
    }

    const {CustomStep} = flow;

    const renderPage = () => {
        if (page.isLoading) {
            return (
                <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            );
        }
        if (page.kind === 'custom') {
            if (!CustomStep) {
                return null;
            }
            return (
                <CustomStep
                    key={page.id}
                    page={page}
                    policyID={target.policyID}
                    isSubmitting={isSubmitting}
                    errorText={errorText || undefined}
                    onComplete={(values) => submitPage(values ?? {})}
                    goToStep={goToStep}
                />
            );
        }
        return (
            <PageRenderer
                formID={flow.formID}
                page={page}
                isEditing={position.isEditing}
                isLoading={isSubmitting}
                errorText={errorText || undefined}
                onSubmit={submitPage}
                onEdit={editPage}
                onRowPress={pressRow}
            />
        );
    };

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
            {renderPage()}
        </InteractiveStepWrapper>
    );
}

export default OnboardingFlowPage;
