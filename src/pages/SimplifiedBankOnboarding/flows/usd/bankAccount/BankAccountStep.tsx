/**
 * The bank step of the USD flow. Like the real step it has one page, the variant of the setup type that the user picked
 * on the entry page: Plaid or manual. Only that variant is a page of the step, so Next from the country step and a URL
 * that names the other variant both open it. The Plaid variant needs the network, so the step blocks it offline.
 */

import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';

import useLocalize from '@hooks/useLocalize';

import type {SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {OnboardingStep, PageLoadingIndicator, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {SubPageConfig} from '@pages/SimplifiedBankOnboarding/core';

import React from 'react';

import type {BankAccountPageName} from './bankAccountPages';

import PAGES from './bankAccountPages';
import getBankAccountAnswers from './getBankAccountAnswers';
import ManualBankPage from './ManualBankPage';
import PlaidBankPage from './PlaidBankPage';

const WRAPPER_ID = 'SimplifiedBankOnboardingBankInfo';

/** The one page of the variant that the user picked, or undefined while the setup type is not known */
function getBankPage(setupType: SetupType | undefined): SubPageConfig<BankAccountPageName> | undefined {
    if (setupType === SBO_CONST.SETUP_TYPE.PLAID) {
        return {
            name: PAGES.PLAID,
            content: (
                <FullPageOfflineBlockingView>
                    <PlaidBankPage />
                </FullPageOfflineBlockingView>
            ),
        };
    }
    if (setupType === SBO_CONST.SETUP_TYPE.MANUAL) {
        return {name: PAGES.MANUAL, content: <ManualBankPage />};
    }
    return undefined;
}

function BankAccountStep() {
    const {translate} = useLocalize();
    const {setupType} = getBankAccountAnswers(useFlowData());

    const title = translate('bankAccount.bankInfo');
    const bankPage = getBankPage(setupType);

    if (!bankPage) {
        return (
            <OnboardingStep
                title={title}
                wrapperID={WRAPPER_ID}
                shouldEnablePickerAvoiding={false}
            >
                <PageLoadingIndicator />
            </OnboardingStep>
        );
    }

    return (
        <OnboardingStep
            title={title}
            wrapperID={WRAPPER_ID}
            shouldEnablePickerAvoiding={false}
            pages={[bankPage]}
        />
    );
}

export default BankAccountStep;
