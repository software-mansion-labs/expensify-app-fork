/**
 * Reads the server lists of the NonUSD forms for the flow page. Like the real bank step, a failed read of the bank
 * inputs leaves the bank step with nothing to show, so the gate shows the not found page there instead.
 */
import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';

import type {ReactNode} from 'react';

import React from 'react';

import useNonUSDServerLists from './useNonUSDServerLists';

type NonUSDServerListsGateProps = {
    data: FlowData;

    /** The workspace of the flow */
    policyID: string | undefined;

    /** The step of the URL */
    stepID: string | undefined;

    /** The flow page, shown while the gate lets it through */
    children: ReactNode;
};

function NonUSDServerListsGate({data, policyID, stepID, children}: NonUSDServerListsGateProps) {
    const {hasBankFieldsReadFailed} = useNonUSDServerLists(data, policyID);

    if (hasBankFieldsReadFailed && stepID === SBO_CONST.NON_USD.PAGE_NAMES.BANK_INFO) {
        return <NotFoundPage />;
    }
    return children;
}

export default NonUSDServerListsGate;
