/**
 * The screen body of a flow: the header with the step counter and the open page of the plan. The flow descriptor
 * supplies the form and the plan, whose custom pages render their own screens, and the screen supplies the routes and
 * the position of the URL, so the same page serves every flow.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useThemeStyles from '@hooks/useThemeStyles';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import PageRenderer from '@pages/SimplifiedBankOnboarding/core/form/pages/PageRenderer';
import type {FlowRoutes} from '@pages/SimplifiedBankOnboarding/core/navigation/flowNavigation';
import getStepCounter from '@pages/SimplifiedBankOnboarding/core/plan/getStepCounter';
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import type {FlowVocabulary} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import type {FlowDataSource, FlowDataStatus, FlowDescriptor} from './types';

import useOnboardingFlow from './useOnboardingFlow';

type OnboardingFlowPageProps<TData, TVocabulary extends FlowVocabulary> = {
    flow: FlowDescriptor<TData, TVocabulary>;

    /** The routes of the flow, which the controller navigates along */
    routes: FlowRoutes;

    /** The position that the URL names. Undefined when it names no full and known position, so the flow opens the position where it resumes. */
    urlPosition: FlowPosition<TVocabulary> | undefined;

    /** The workspace of the URL, which the plan builders and the custom steps get */
    policyID: string | undefined;
    dataSource: FlowDataSource<TData>;

    /** Whether the data of the plan is there. The page shows a loader until it is. */
    dataStatus: FlowDataStatus;
};

function OnboardingFlowPage<TData, TVocabulary extends FlowVocabulary>({flow, routes, urlPosition, policyID, dataSource, dataStatus}: OnboardingFlowPageProps<TData, TVocabulary>) {
    const styles = useThemeStyles();
    const {plan, step, page, position, isSubmitting, canSubmitOffline, errorText, isWaitingForRead, hasReadFailed, submitPage, goBack, editPage, pressRow, goToStep} = useOnboardingFlow({
        flow,
        routes,
        urlPosition,
        policyID,
        dataSource,
        dataStatus,
    });

    // A page whose server data could not be read has nothing to show, like the real bank step without its bank inputs
    if (dataStatus === 'notFound' || hasReadFailed) {
        return <NotFoundPage />;
    }

    // Until the data is there, and while the redirect from a URL without a reachable position lands
    if (dataStatus === 'loading' || !step || !page || !position) {
        return (
            <FullScreenLoadingIndicator
                shouldUseGoBackButton
                onGoBack={goBack}
            />
        );
    }

    const stepCounter = getStepCounter(plan.steps, step.id);

    const renderPage = () => {
        if (isWaitingForRead) {
            return (
                <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            );
        }
        if (page.kind === 'custom') {
            return (
                <React.Fragment key={page.id}>
                    {page.render({
                        policyID,
                        isSubmitting,
                        errorText: errorText || undefined,
                        onComplete: (values) => submitPage(values ?? {}),
                        goToStep,
                    })}
                </React.Fragment>
            );
        }
        return (
            <PageRenderer
                formID={flow.formID}
                step={step}
                page={page}
                answers={plan.answers}
                isEditing={position.isEditing}
                canSubmitOffline={canSubmitOffline}
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
            startStepIndex={stepCounter?.index}
            stepNames={stepCounter?.stepNames}
            stepAccessibilityDescription={page.kind === 'custom' ? undefined : page.title}
            shouldAnnounceCompletedSteps
            shouldShowOfflineIndicatorInWideScreen={!canSubmitOffline}
            shouldEnableMaxHeight
            shouldRemountSubHeaderOnStepChange
        >
            {renderPage()}
        </InteractiveStepWrapper>
    );
}

export default OnboardingFlowPage;
