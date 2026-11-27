/**
 * The screen of a connected bank account. The real step shows a summary of the account with its own actions. The lab only
 * confirms the connection and lets the flow finish. It sends nothing, so it works offline.
 */
import Button from '@components/Button';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

function ConnectedBankAccount() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {goNext} = usePageNavigation();

    return (
        <View style={[styles.mh5, styles.flex1, styles.gap3]}>
            <Text style={styles.textHeadlineLineHeightXXL}>{translate('bankAccount.bbaAdded')}</Text>
            <Text style={styles.textSupporting}>{translate('bankAccount.bbaAddedDescription')}</Text>
            <Button
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                size={CONST.BUTTON_SIZE.LARGE}
                style={styles.mt5}
                onPress={() => goNext()}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
            >
                <Button.Text>{translate('common.confirm')}</Button.Text>
            </Button>
        </View>
    );
}

export default ConnectedBankAccount;
