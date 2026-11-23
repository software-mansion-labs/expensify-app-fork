/**
 * The identity check of the USD flow. A fake Onfido widget keeps the real sequence: a token on mount, then the result,
 * which the controller sends as the request of the step and waits for before it moves on.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';

import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';
import {openIdentityCheckFlow} from '@pages/SimplifiedBankOnboarding/flows/usd/requests/identityCheck';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect} from 'react';
import {View} from 'react-native';

type OnfidoStepProps = Pick<CustomStepProps, 'policyID' | 'isSubmitting' | 'errorText' | 'onComplete'>;

function OnfidoStep({policyID, isSubmitting, errorText, onComplete}: OnfidoStepProps) {
    const styles = useThemeStyles();
    const [onfidoToken] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN);

    useEffect(() => {
        if (!policyID) {
            return;
        }
        openIdentityCheckFlow(policyID);
    }, [policyID]);

    return (
        <FullPageOfflineBlockingView>
            {onfidoToken ? (
                <View style={[styles.mh5, styles.gap3]}>
                    <Text style={styles.textSupporting}>The real step opens the Onfido widget here. The mock accepts any result.</Text>
                    <Button
                        variant={CONST.BUTTON_VARIANT.SUCCESS}
                        onPress={() => onComplete()}
                        isLoading={isSubmitting}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    >
                        <Button.Text>[mock] Pass the identity check</Button.Text>
                    </Button>
                    <FormHelpMessage message={errorText} />
                </View>
            ) : (
                <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            )}
        </FullPageOfflineBlockingView>
    );
}

export default OnfidoStep;
