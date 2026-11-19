/**
 * The route screen of the NonUSD flow. Its forms need the server lists of the country, so the flow page waits behind
 * the gate that reads them.
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import type SCREENS from '@src/SCREENS';

import React from 'react';

import nonUSDFlow from './nonUSDFlow';
import NonUSDServerListsGate from './NonUSDServerListsGate';
import SetupFlowPage from './SetupFlowPage';

type NonUSDSetupPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

function NonUSDSetupPage({route}: NonUSDSetupPageProps) {
    return (
        <SetupFlowPage
            flow={nonUSDFlow}
            kind="nonUSD"
            params={route.params}
            Gate={NonUSDServerListsGate}
        />
    );
}

export default NonUSDSetupPage;
