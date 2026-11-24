/**
 * The screen of the NonUSD flow: its steps in flow order. The docusign step appears only for a currency that needs the
 * signed authorization form, and the finish step has no number. Without a step in the URL the flow opens the step that
 * the saved data points to, because the server stores no step for this flow.
 */
import useOnyx from '@hooks/useOnyx';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {getSetupCurrency, requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {FlowStep, OnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React from 'react';

import AgreementsStep from './agreements/AgreementsStep';
import BankInfoStep from './bankInfo/BankInfoStep';
import BeneficialOwnersStep from './beneficialOwners/BeneficialOwnersStep';
import BusinessInfoStep from './businessInfo/BusinessInfoStep';
import CountryStep from './country/CountryStep';
import DocusignStep from './docusign/DocusignStep';
import FinishStep from './finish/FinishStep';
import getNonUSDResumeStep from './getNonUSDResumeStep';
import SignerStep from './signer/SignerStep';

type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

const {PAGE_NAMES} = SBO_CONST.NON_USD;

function NonUSDFlowPage({route}: NonUSDFlowPageProps) {
    const policyID = route.params?.policyID;
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [workspace] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: (workspaces) => (policyID ? workspaces?.[policyID] : undefined)});

    const currency = getSetupCurrency(workspace, account?.achData, draft);

    return (
        <OnboardingFlow
            target={{kind: 'nonUSD', policyID, backTo: route.params?.backTo}}
            params={route.params}
            resumeAt={getNonUSDResumeStep(account, draft, currency)}
        >
            <FlowStep
                id={PAGE_NAMES.COUNTRY}
                component={CountryStep}
            />
            <FlowStep
                id={PAGE_NAMES.BANK_INFO}
                component={BankInfoStep}
            />
            <FlowStep
                id={PAGE_NAMES.BUSINESS_INFO}
                component={BusinessInfoStep}
            />
            <FlowStep
                id={PAGE_NAMES.BENEFICIAL_OWNER_INFO}
                component={BeneficialOwnersStep}
            />
            <FlowStep
                id={PAGE_NAMES.SIGNER_INFO}
                component={SignerStep}
            />
            <FlowStep
                id={PAGE_NAMES.AGREEMENTS}
                component={AgreementsStep}
            />
            <FlowStep
                id={PAGE_NAMES.DOCUSIGN}
                component={DocusignStep}
                skip={!requiresDocusignStep(currency)}
            />
            <FlowStep
                id={PAGE_NAMES.FINISH}
                component={FinishStep}
                counter="none"
            />
        </OnboardingFlow>
    );
}

export default NonUSDFlowPage;
