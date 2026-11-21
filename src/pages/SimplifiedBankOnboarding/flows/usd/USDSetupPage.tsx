/**
 * The route screen of the USD flow
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import SetupFlowPage from '@pages/SimplifiedBankOnboarding/flows/shared/setupScreen/SetupFlowPage';
import useSetupFlow from '@pages/SimplifiedBankOnboarding/flows/shared/setupScreen/useSetupFlow';

import type SCREENS from '@src/SCREENS';

import React from 'react';

import usdFlow from './usdFlow';

type USDSetupPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

function USDSetupPage({route}: USDSetupPageProps) {
    const setup = useSetupFlow('usd', route.params);
    return (
        <SetupFlowPage
            flow={usdFlow}
            setup={setup}
            params={route.params}
        />
    );
}

export default USDSetupPage;
