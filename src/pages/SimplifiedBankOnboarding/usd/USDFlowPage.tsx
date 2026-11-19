/**
 * The page of the USD flow. The URL says which step is open, and the flow definition decides where forward and back go,
 * so this page only maps the page name to its component.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {findStep, getHeaderStepNames} from '@pages/SimplifiedBankOnboarding/flow/flowNavigation';
import getFlowNavigationHandlers from '@pages/SimplifiedBankOnboarding/flow/getFlowNavigationHandlers';
import USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import type {USDPageName} from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import useFlowContext from '@pages/SimplifiedBankOnboarding/flow/useFlowContext';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import type USDPageProps from './types';

import BankInfo from './BankInfo/BankInfo';
import BeneficialOwners from './BeneficialOwners/BeneficialOwners';
import BusinessInfo from './BusinessInfo/BusinessInfo';
import CompleteVerification from './CompleteVerification';
import ConnectBankAccount from './ConnectBankAccount/ConnectBankAccount';
import Country from './Country';
import KYBDocuments from './KYBDocuments';
import PersonalInfo from './PersonalInfo/PersonalInfo';
import VerifyIdentity from './VerifyIdentity';

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

const {PAGE_NAMES} = SBO_CONST.USD;

const STEP_COMPONENTS: Record<USDPageName, React.ComponentType<USDPageProps>> = {
    [PAGE_NAMES.COUNTRY]: Country,
    [PAGE_NAMES.BANK_ACCOUNT]: BankInfo,
    [PAGE_NAMES.REQUESTOR]: PersonalInfo,
    [PAGE_NAMES.VERIFY_IDENTITY]: VerifyIdentity,
    [PAGE_NAMES.COMPANY]: BusinessInfo,
    [PAGE_NAMES.BENEFICIAL_OWNERS]: BeneficialOwners,
    [PAGE_NAMES.ACH_CONTRACT]: CompleteVerification,
    [PAGE_NAMES.KYB_DOCS]: KYBDocuments,
    [PAGE_NAMES.VALIDATION]: ConnectBankAccount,
};

function USDFlowPage({route}: USDFlowPageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const backTo = route.params?.backTo;
    const context = useFlowContext(policyID);

    const currentStep = findStep(USD_FLOW, route.params?.page);
    const CurrentPage = STEP_COMPONENTS[currentStep.id];

    const {goToNextPage, goToPreviousPage} = getFlowNavigationHandlers({
        flow: USD_FLOW,
        context,
        currentStep,
        getRoute: ({page, subPage}) => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page, subPage, backTo}),
        backTo,
    });

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <CurrentPage
                onSubmit={goToNextPage}
                onBackButtonPress={goToPreviousPage}
                policyID={policyID}
                currentSubPage={route.params?.subPage}
                stepNames={getHeaderStepNames(USD_FLOW, context)}
                startStepIndex={currentStep.headerPosition}
                backTo={backTo}
            />
        </View>
    );
}

export default USDFlowPage;
