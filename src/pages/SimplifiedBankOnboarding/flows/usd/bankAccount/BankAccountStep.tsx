/**
 * The bank step of the USD flow. Like the real step it has one page, the variant of the setup type that the user picked
 * on the entry page: Plaid or manual. Only that variant is rendered, so Next from the country step and a URL that names
 * the other variant both open it. The Plaid variant needs the network, so the step blocks it offline.
 */

import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';

import useLocalize from '@hooks/useLocalize';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {OnboardingStep, PageLoadingIndicator, SubPage} from '@pages/SimplifiedBankOnboarding/core';
import {useUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';

import React from 'react';

import ManualBankPage from './ManualBankPage';
import PlaidBankPage from './PlaidBankPage';

const {BANK_INFO_SUB_PAGES: PAGES} = SBO_CONST.USD;

function BankAccountStep() {
    const {translate} = useLocalize();
    const {setupType} = useUSDAnswers();

    const isPlaid = setupType === SBO_CONST.SETUP_TYPE.PLAID;
    const isManual = setupType === SBO_CONST.SETUP_TYPE.MANUAL;

    return (
        <OnboardingStep
            title={translate('bankAccount.bankInfo')}
            wrapperID="SimplifiedBankOnboardingBankInfo"
            shouldEnablePickerAvoiding={false}
        >
            {isPlaid && (
                <SubPage name={PAGES.PLAID}>
                    <FullPageOfflineBlockingView>
                        <PlaidBankPage />
                    </FullPageOfflineBlockingView>
                </SubPage>
            )}
            {isManual && (
                <SubPage name={PAGES.MANUAL}>
                    <ManualBankPage />
                </SubPage>
            )}
            {!isPlaid && !isManual && <PageLoadingIndicator />}
        </OnboardingStep>
    );
}

export default BankAccountStep;
