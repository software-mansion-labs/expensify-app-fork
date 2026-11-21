/**
 * The last page of the NonUSD flow. The real page always shows the same text. This one picks it from the state of the
 * account, so the mock review can be played and its result seen here.
 */
import Button from '@components/Button';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/core';
import MockReviewButtons from '@pages/SimplifiedBankOnboarding/flows/shared/MockReviewButtons';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

type FinishStepProps = Pick<CustomStepProps, 'policyID' | 'onComplete'>;

function FinishStep({policyID, onComplete}: FinishStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [state] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData?.state});

    const renderContent = () => {
        if (state === SBO_CONST.STATE.OPEN) {
            return <Text style={styles.textHeadlineLineHeightXXL}>{translate('workspace.bankAccount.allSet')}</Text>;
        }
        return (
            <>
                <Text style={styles.textLabelSupporting}>{translate('finishStep.thanksFor')}</Text>
                {state === SBO_CONST.STATE.VERIFYING && <MockReviewButtons policyID={policyID} />}
            </>
        );
    };

    return (
        <ScrollView contentContainerStyle={[styles.flexGrow1, styles.ph5, styles.pb5]}>
            {renderContent()}
            <Button
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                onPress={() => onComplete()}
                style={styles.mt5}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
            >
                <Button.Text>{translate('common.done')}</Button.Text>
            </Button>
        </ScrollView>
    );
}

export default FinishStep;
