/**
 * The last page of the NonUSD flow. Like `NonUSD/Finish` it has its own screen and header instead of the step wrapper, and
 * its back button leaves the flow. The real page always shows the same text; this one picks it from the state of the
 * account, so the mock review can be played and its result seen here.
 */
import Button from '@components/Button';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import MockReviewButtons from '@pages/SimplifiedBankOnboarding/components/MockReviewButtons';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import type NonUSDPageProps from './types';

function Finish({onSubmit, policyID}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const state = account?.achData?.state;

    let content = <Text style={styles.textLabelSupporting}>{translate('finishStep.thanksFor')}</Text>;
    if (state === SBO_CONST.STATE.VERIFYING) {
        content = (
            <>
                <Text style={styles.textLabelSupporting}>{translate('finishStep.thanksFor')}</Text>
                <MockReviewButtons policyID={policyID} />
            </>
        );
    } else if (state === SBO_CONST.STATE.OPEN) {
        content = <Text style={styles.textHeadlineLineHeightXXL}>{translate('workspace.bankAccount.allSet')}</Text>;
    }

    return (
        <ScreenWrapper
            testID="SimplifiedBankOnboardingFinish"
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                onBackButtonPress={onSubmit}
            />
            <ScrollView contentContainerStyle={[styles.flexGrow1, styles.ph5, styles.pb5]}>
                {content}
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    onPress={onSubmit}
                    style={styles.mt5}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.done')}</Button.Text>
                </Button>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default Finish;
