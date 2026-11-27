/**
 * The identity check of the USD flow. A fake Onfido widget keeps the real sequence: a token, which the controller reads
 * when the page opens, then the result, which the controller sends as the request of the step and waits for before it
 * moves on.
 */
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type OnfidoStepProps = Pick<CustomStepProps, 'isSubmitting' | 'errorText' | 'onComplete'>;

function OnfidoStep({isSubmitting, errorText, onComplete}: OnfidoStepProps) {
    const styles = useThemeStyles();

    return (
        <FullPageOfflineBlockingView>
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
        </FullPageOfflineBlockingView>
    );
}

export default OnfidoStep;
