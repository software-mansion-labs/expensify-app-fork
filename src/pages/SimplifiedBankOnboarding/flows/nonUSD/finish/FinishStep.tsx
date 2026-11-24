/**
 * The last page of the NonUSD flow. Its text follows the state of the account, so the mock review can be played and
 * its result seen here. Back and Done both return to the entry.
 */
import Button from '@components/Button';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {OnboardingStep, useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';
import MockReviewButtons from '@pages/SimplifiedBankOnboarding/flows/shared/MockReviewButtons';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function FinishStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {target, returnToEntry} = useOnboardingFlow();
    const [state] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        selector: (account) => account?.achData?.state,
    });

    return (
        <OnboardingStep
            title={translate('bankAccount.addBankAccount')}
            wrapperID="SimplifiedBankOnboardingFinish"
            onBackFromStart={returnToEntry}
            shouldEnableMaxHeight
            shouldEnablePickerAvoiding={false}
        >
            <ScrollView contentContainerStyle={[styles.flexGrow1, styles.ph5, styles.pb5]}>
                {state === SBO_CONST.STATE.OPEN ? (
                    <Text style={styles.textHeadlineLineHeightXXL}>{translate('workspace.bankAccount.allSet')}</Text>
                ) : (
                    <Text style={styles.textLabelSupporting}>{translate('finishStep.thanksFor')}</Text>
                )}
                {state === SBO_CONST.STATE.VERIFYING && <MockReviewButtons policyID={target.policyID} />}
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    onPress={returnToEntry}
                    style={styles.mt5}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.done')}</Button.Text>
                </Button>
            </ScrollView>
        </OnboardingStep>
    );
}

export default FinishStep;
