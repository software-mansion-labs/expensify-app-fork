/**
 * The page of the NonUSD flow. The URL says which step is open, and the flow definition decides where forward and back
 * go, including the docusign step that only some currencies have, so this page only maps the page name to its component.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {findStep, getHeaderStepNames} from '@pages/SimplifiedBankOnboarding/flow/flowNavigation';
import getFlowNavigationHandlers from '@pages/SimplifiedBankOnboarding/flow/getFlowNavigationHandlers';
import NON_USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/nonUSDFlow';
import type {NonUSDPageName} from '@pages/SimplifiedBankOnboarding/flow/nonUSDFlow';
import useFlowContext from '@pages/SimplifiedBankOnboarding/flow/useFlowContext';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import type NonUSDPageProps from './types';

import Agreements from './Agreements';
import BankInfo from './BankInfo/BankInfo';
import BeneficialOwnerInfo from './BeneficialOwnerInfo/BeneficialOwnerInfo';
import BusinessInfo from './BusinessInfo/BusinessInfo';
import Country from './Country';
import Docusign from './Docusign';
import Finish from './Finish';
import SignerInfo from './SignerInfo/SignerInfo';

type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

const {PAGE_NAMES} = SBO_CONST.NON_USD;

const STEP_COMPONENTS: Record<NonUSDPageName, React.ComponentType<NonUSDPageProps>> = {
    [PAGE_NAMES.COUNTRY]: Country,
    [PAGE_NAMES.BANK_INFO]: BankInfo,
    [PAGE_NAMES.BUSINESS_INFO]: BusinessInfo,
    [PAGE_NAMES.BENEFICIAL_OWNER_INFO]: BeneficialOwnerInfo,
    [PAGE_NAMES.SIGNER_INFO]: SignerInfo,
    [PAGE_NAMES.AGREEMENTS]: Agreements,
    [PAGE_NAMES.DOCUSIGN]: Docusign,
    [PAGE_NAMES.FINISH]: Finish,
};

function NonUSDFlowPage({route}: NonUSDFlowPageProps) {
    const styles = useThemeStyles();
    const policyID = route.params?.policyID;
    const backTo = route.params?.backTo;
    const context = useFlowContext(policyID);

    const currentStep = findStep(NON_USD_FLOW, route.params?.page);
    const CurrentPage = STEP_COMPONENTS[currentStep.id];

    const {goToNextPage, goToPreviousPage} = getFlowNavigationHandlers({
        flow: NON_USD_FLOW,
        context,
        currentStep,
        getRoute: ({page, subPage}) => ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page, subPage, backTo}),
        backTo,
    });

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <CurrentPage
                onSubmit={goToNextPage}
                onBackButtonPress={goToPreviousPage}
                policyID={policyID}
                currency={context.currency}
                stepNames={getHeaderStepNames(NON_USD_FLOW, context)}
                startStepIndex={currentStep.headerPosition}
                currentSubPage={route.params?.subPage}
                backTo={backTo}
            />
        </View>
    );
}

export default NonUSDFlowPage;
