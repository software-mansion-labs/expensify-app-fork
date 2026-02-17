import React, {useMemo, useState} from 'react';
import {Animated, View} from 'react-native';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MultifactorAuthenticationTriggerCancelConfirmModal from '@components/MultifactorAuthentication/TriggerCancelConfirmModal';
import ScreenWrapper from '@components/ScreenWrapper';
import useThemeStyles from '@hooks/useThemeStyles';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {MultifactorAuthenticationParamList} from '@libs/Navigation/types';
import Navigation from '@navigation/Navigation';
import type SCREENS from '@src/SCREENS';
import MultifactorAuthenticationAuthorizeTransactionActions from './AuthorizeTransactionActions';
import MultifactorAuthenticationAuthorizeTransactionContent from './AuthorizeTransactionContent';
import {expandedRHPProgress} from '@components/WideRHPContextProvider';
import calculateSuperWideRHPWidth from '@navigation/helpers/calculateSuperWideRHPWidth';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import variables from '@styles/variables';
import calculateReceiptPaneRHPWidth from '@navigation/helpers/calculateReceiptPaneRHPWidth';
import useWindowDimensions from '@hooks/useWindowDimensions';
import useLocalize from '@hooks/useLocalize';
import Overlay from '@navigation/AppNavigator/Navigators/Overlay';

const singleRHPWidth = variables.sideBarWidth;
const getWideRHPWidth = (windowWidth: number) => variables.sideBarWidth + calculateReceiptPaneRHPWidth(windowWidth);

type MultifactorAuthenticationAuthorizeTransactionPageProps = PlatformStackScreenProps<MultifactorAuthenticationParamList, typeof SCREENS.MULTIFACTOR_AUTHENTICATION.AUTHORIZE_TRANSACTION>;

function MultifactorAuthenticationScenarioAuthorizeTransactionPage({route}: MultifactorAuthenticationAuthorizeTransactionPageProps) {
    const styles = useThemeStyles();

    const {translate} = useLocalize();
    // TODO: Use context here when merged

    // const {executeScenario, cancel} = useMultifactorAuthenticationContext();
    const transactionID = route.params.transactionID;

    const [isConfirmModalVisible, setConfirmModalVisibility] = useState(false);
    const showConfirmModal = () => {

        setConfirmModalVisibility(true);
    };
    const hideConfirmModal = () => {

        setConfirmModalVisibility(false);
    };
    const approveTransaction = () => {

        // TODO: Use context here when merged
        // executeScenario(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.AUTHORIZE_TRANSACTION, {
        //     transactionID,
        // });
    };
    // Remove this eslint disable when below TODO is done

    // eslint-disable-next-line rulesdir/prefer-early-return
    const denyTransaction = () => {
        if (isConfirmModalVisible) {
            hideConfirmModal();
        }
        // TODO: Use context here when merged
        Navigation.closeRHPFlow();
        // cancel();
    };
    const {isSmallScreenWidth, shouldUseNarrowLayout} = useResponsiveLayout();

    const {windowWidth} = useWindowDimensions();

    const animatedWidth = expandedRHPProgress.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [singleRHPWidth, getWideRHPWidth(windowWidth), calculateSuperWideRHPWidth(windowWidth)],
    });

    const animatedWidthStyle = useMemo(() => {
        return {
            width: shouldUseNarrowLayout ? '100%' : animatedWidth,
        } as const;
    }, [animatedWidth, shouldUseNarrowLayout]);

    const overlayPositionLeft = useMemo(() => -1 * calculateSuperWideRHPWidth(windowWidth), [windowWidth]);

    return (
        <>
            {!shouldUseNarrowLayout && (
                <Overlay
                    positionLeftValue={overlayPositionLeft}
                />
            )}
            <Animated.View style={[styles.pAbsolute, styles.r0, styles.h100, styles.overflowHidden, styles.appBG, animatedWidthStyle]}>
                <HeaderWithBackButton
                    title={translate('multifactorAuthentication.reviewTransaction.reviewTransaction')}
                    onBackButtonPress={showConfirmModal}
                    shouldShowBackButton
                />
                <FullPageOfflineBlockingView>
                    <View style={[styles.flex1, styles.flexColumn, styles.justifyContentBetween]}>
                        <MultifactorAuthenticationAuthorizeTransactionContent transactionID={transactionID} />
                        <MultifactorAuthenticationAuthorizeTransactionActions
                            onAuthorize={approveTransaction}
                            onDeny={showConfirmModal}
                        />
                        <MultifactorAuthenticationTriggerCancelConfirmModal
                            // TODO: Uncomment when context is merged
                            // scenario={CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.AUTHORIZE_TRANSACTION}
                            isVisible={isConfirmModalVisible}
                            onConfirm={denyTransaction}
                            onCancel={hideConfirmModal}
                        />
                    </View>
                </FullPageOfflineBlockingView>
            </Animated.View>
        </>
    );
}

MultifactorAuthenticationScenarioAuthorizeTransactionPage.displayName = 'MultifactorAuthenticationScenarioAuthorizeTransactionPage';

export default MultifactorAuthenticationScenarioAuthorizeTransactionPage;
