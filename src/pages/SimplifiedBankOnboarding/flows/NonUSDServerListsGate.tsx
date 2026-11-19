/**
 * Reads the server lists of the NonUSD forms for the flow page. Like the real bank step, a failed read of the bank
 * inputs leaves the bank step with nothing to show, so the gate shows the not found page there instead.
 */
import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import React from 'react';

import type {SetupFlowGateProps} from './SetupFlowPage';

import useNonUSDServerLists from './useNonUSDServerLists';

function NonUSDServerListsGate({data, policyID, stepID, children}: SetupFlowGateProps) {
    const {hasBankFieldsReadFailed} = useNonUSDServerLists(data, policyID);

    if (hasBankFieldsReadFailed && stepID === SBO_CONST.NON_USD.PAGE_NAMES.BANK_INFO) {
        return <NotFoundPage />;
    }
    return children;
}

export default NonUSDServerListsGate;
