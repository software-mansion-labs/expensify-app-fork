/**
 * The screen that an invited director opens from the email: a flow of one step without a counter, on its own form, for
 * the bank account that the link names. The route has no step param: the flow knows the step from its kind.
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {ENTER_SIGNER_INFO_STEP_ID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {FlowStep, OnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';

import type SCREENS from '@src/SCREENS';

import React from 'react';

import InvitedSignerStep from './InvitedSignerStep';

type EnterSignerInfoPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO>;

function EnterSignerInfoPage({route}: EnterSignerInfoPageProps) {
    const bankAccountIDParam = route.params?.bankAccountID;

    return (
        <OnboardingFlow
            target={{
                kind: 'enterSignerInfo',
                policyID: route.params?.policyID,
                bankAccountID: bankAccountIDParam ? Number(bankAccountIDParam) : undefined,
                isCompleted: route.params?.isCompleted === 'true',
            }}
            params={route.params}
        >
            <FlowStep
                id={ENTER_SIGNER_INFO_STEP_ID}
                isComplete={false}
                counter="none"
            >
                <InvitedSignerStep />
            </FlowStep>
        </OnboardingFlow>
    );
}

export default EnterSignerInfoPage;
