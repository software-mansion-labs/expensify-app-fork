import BlockingView from '@components/BlockingViews/BlockingView';
import Button from '@components/ButtonComposed';
import {loadIllustration} from '@components/Icon/IllustrationLoader';
import {useMultifactorAuthenticationInternal} from '@components/MultifactorAuthentication/Context/MultifactorAuthenticationInternalApiContext';
import ScrollView from '@components/ScrollView';

import {useMemoizedLazyAsset} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

/**
 * Shown when the scenario action's answer was lost and re-sending it didn't settle it. An idempotent scenario offers
 * "Try again" with a fresh challenge; any other only asks the user to check before trying again. Closing sends nothing.
 */
function DecisionUnconfirmedContent() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {asset: icon} = useMemoizedLazyAsset(() => loadIllustration('MagnifyingGlassSpyMouthClosed'));
    const {requestCancel, retryWithNewChallenge, state} = useMultifactorAuthenticationInternal();
    const {scenario, canRetryUnconfirmed} = state;

    const copy = scenario && 'unconfirmedCopy' in scenario ? scenario.unconfirmedCopy : undefined;
    const title = copy?.title ?? 'multifactorAuthentication.unconfirmed.title';
    const subtitle = copy?.subtitle ?? (canRetryUnconfirmed ? 'multifactorAuthentication.unconfirmed.retrySubtitle' : 'multifactorAuthentication.unconfirmed.checkSubtitle');

    return (
        <View
            style={[styles.flex1, styles.gap2]}
            testID={CONST.MULTIFACTOR_AUTHENTICATION.TEST_ID.UNCONFIRMED_SCREEN}
        >
            <ScrollView contentContainerStyle={[styles.flexGrow1, styles.justifyContentCenter]}>
                <BlockingView
                    icon={icon}
                    contentFitImage="fill"
                    iconWidth={variables.magnifyingGlassSpyMouthClosedWidth}
                    iconHeight={variables.magnifyingGlassSpyMouthClosedHeight}
                    title={translate(title)}
                    subtitle={translate(subtitle)}
                    containerStyle={styles.ph5}
                />
            </ScrollView>
            <View style={[styles.m5, styles.mt0, styles.gap3]}>
                {canRetryUnconfirmed && (
                    <Button
                        variant={CONST.BUTTON_VARIANT.SUCCESS}
                        size={CONST.BUTTON_SIZE.LARGE}
                        onPress={retryWithNewChallenge}
                        testID={CONST.MULTIFACTOR_AUTHENTICATION.TEST_ID.UNCONFIRMED_RETRY_BUTTON}
                    >
                        <Button.Text>{translate('common.tryAgain')}</Button.Text>
                    </Button>
                )}
                <Button
                    variant={canRetryUnconfirmed ? undefined : CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    onPress={requestCancel}
                    testID={CONST.MULTIFACTOR_AUTHENTICATION.TEST_ID.UNCONFIRMED_CLOSE_BUTTON}
                >
                    <Button.Text>{translate(canRetryUnconfirmed ? 'common.close' : 'common.buttonConfirm')}</Button.Text>
                </Button>
            </View>
        </View>
    );
}

export default DecisionUnconfirmedContent;
