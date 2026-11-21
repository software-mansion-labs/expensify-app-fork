/**
 * The route screen of the NonUSD flow. Its forms need the server lists of the country, so the flow page waits behind
 * the gate that reads them.
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import SetupFlowPage from '@pages/SimplifiedBankOnboarding/flows/shared/setupScreen/SetupFlowPage';
import useSetupFlow from '@pages/SimplifiedBankOnboarding/flows/shared/setupScreen/useSetupFlow';

import type SCREENS from '@src/SCREENS';

import React from 'react';

import nonUSDFlow from './nonUSDFlow';
import NonUSDServerListsGate from './serverLists/NonUSDServerListsGate';

type NonUSDSetupPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

function NonUSDSetupPage({route}: NonUSDSetupPageProps) {
    const setup = useSetupFlow('nonUSD', route.params);

    return (
        <NonUSDServerListsGate
            data={setup.dataSource.data}
            policyID={setup.target.policyID}
            stepID={route.params?.page}
        >
            <SetupFlowPage
                flow={nonUSDFlow}
                setup={setup}
                params={route.params}
            />
        </NonUSDServerListsGate>
    );
}

export default NonUSDSetupPage;
