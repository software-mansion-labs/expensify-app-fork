/**
 * Shows the page of a flow step once `useFlowAccount` has the data of its route, and a loader or a blocker until then.
 */
import ReimbursementAccountLoadingIndicator from '@components/ReimbursementAccountLoadingIndicator';

import NotFoundPage from '@pages/SimplifiedBankOnboarding/components/NotFoundPage';
import OfflineBlockedPage from '@pages/SimplifiedBankOnboarding/components/OfflineBlockedPage';

import React from 'react';

import type {FlowAccountStatus} from './useFlowAccount';

type FlowAccountGateProps = {
    status: FlowAccountStatus;

    /** Leaves the flow, because the steps before this one have no data either */
    onLeaveFlow: () => void;
    children: React.ReactNode;
};

function FlowAccountGate({status, onLeaveFlow, children}: FlowAccountGateProps) {
    switch (status) {
        case 'loading':
            return <ReimbursementAccountLoadingIndicator onBackButtonPress={onLeaveFlow} />;
        case 'offline':
            return <OfflineBlockedPage onBackButtonPress={onLeaveFlow} />;
        case 'notFound':
            return <NotFoundPage onBackButtonPress={onLeaveFlow} />;
        case 'ready':
            return children;
        default:
            return null;
    }
}

export default FlowAccountGate;
