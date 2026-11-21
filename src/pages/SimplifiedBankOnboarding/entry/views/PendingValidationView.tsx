/**
 * A USD account that waits for the test deposit amounts has nothing to pick on the entry page, so the page renders the
 * USD flow at the position where it resumes, which is the validation step. Nothing redirects: the entry URL stays, and
 * Back from the validation step leaves the flow because that page exits on back.
 */
import useLocalize from '@hooks/useLocalize';

import type {FlowDataSource, FlowRouteParams, FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/core';
import {OnboardingFlowPage, getResumePosition} from '@pages/SimplifiedBankOnboarding/core';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/flows';
import {usdFlow} from '@pages/SimplifiedBankOnboarding/flows';

import type {Route} from '@src/ROUTES';

import React from 'react';

type PendingValidationViewProps = {
    dataSource: FlowDataSource<FlowData>;
    policyID: string | undefined;
    backTo: Route | undefined;
};

function PendingValidationView({dataSource, policyID, backTo}: PendingValidationViewProps) {
    const {translate} = useLocalize();
    const target: FlowRouteTarget = {kind: 'usd', policyID, backTo};
    const resumePosition = getResumePosition(usdFlow.buildPlan(dataSource.data, {translate, policyID}));
    const routeParams: FlowRouteParams = {page: resumePosition?.stepID, subPage: resumePosition?.pageID};

    return (
        <OnboardingFlowPage
            flow={usdFlow}
            target={target}
            routeParams={routeParams}
            dataSource={dataSource}
            dataStatus="ready"
        />
    );
}

export default PendingValidationView;
