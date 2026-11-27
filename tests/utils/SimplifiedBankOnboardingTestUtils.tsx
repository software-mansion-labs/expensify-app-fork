import {render} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import navigationRef from '@libs/Navigation/navigationRef';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import NonUSDSetupPage from '@pages/SimplifiedBankOnboarding/flows/nonUSD/NonUSDSetupPage';
import type {SetupFlowParams} from '@pages/SimplifiedBankOnboarding/flows/shared/setupScreen/useSetupFlow';
import USDSetupPage from '@pages/SimplifiedBankOnboarding/flows/usd/USDSetupPage';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from './waitForBatchedUpdatesWithAct';

const EUR_POLICY_ID = 'eur';
const USD_POLICY_ID = 'usd';

const Stack = createPlatformStackNavigator<BankOnboardingLabParamList>();

type FlowScreenTarget = {
    kind: 'usd' | 'nonUSD';
    params: SetupFlowParams;
};

type StoredData = {
    achData: ACHData;
    draft?: OnboardingDraft;
};

/** Stores the account, one admin workspace per currency and the draft, then renders the setup screen of the flow on the page that the params name */
async function openFlowPage({kind, params}: FlowScreenTarget, {achData, draft}: StoredData) {
    await Onyx.multiSet({
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT]: {achData},
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES]: {
            [EUR_POLICY_ID]: {id: EUR_POLICY_ID, name: 'Acme EU', outputCurrency: SBO_CONST.CURRENCY.EUR, role: SBO_CONST.WORKSPACE_ROLE.ADMIN},
            [USD_POLICY_ID]: {id: USD_POLICY_ID, name: 'Acme US', outputCurrency: SBO_CONST.CURRENCY.USD, role: SBO_CONST.WORKSPACE_ROLE.ADMIN},
        },
        [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT]: draft ?? {},
    });
    render(
        <OnyxListItemProvider>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator>
                    {kind === 'usd' ? (
                        <Stack.Screen
                            name={SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP}
                            component={USDSetupPage}
                            initialParams={params}
                        />
                    ) : (
                        <Stack.Screen
                            name={SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP}
                            component={NonUSDSetupPage}
                            initialParams={params}
                        />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

export {EUR_POLICY_ID, USD_POLICY_ID, openFlowPage};
