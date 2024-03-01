import React, {useCallback, useEffect, useRef} from 'react';
import type {AppStateStatus} from 'react-native';
import {AppState, Platform, View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TabSelector from '@components/TabSelector/TabSelector';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as IOU from '@libs/actions/IOU';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import * as ReportUtils from '@libs/ReportUtils';
import Navigation from '@navigation/Navigation';
import OnyxTabNavigator, {TopTab} from '@navigation/OnyxTabNavigator';
import MoneyRequestParticipantsSelector from '@pages/iou/steps/MoneyRequstParticipantsPage/MoneyRequestParticipantsSelector';
import CONST from '@src/CONST';
// import ShareActionHandlerModule from '@src/modules/ShareActionHandlerModule';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Report} from '@src/types/onyx';

type ShareRootPageOnyxProps = {
    selectedTab: OnyxEntry<string>;

    iou: OnyxEntry<Report>;
};

type ShareRootPageProps = ShareRootPageOnyxProps;

function ShareRootPage({selectedTab, iou}: ShareRootPageProps) {
    const transactionID = CONST.IOU.OPTIMISTIC_TRANSACTION_ID;
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const fileIsScannable = false;
    const optimisticReportID = ReportUtils.generateReportID();
    const selectedReportID = useRef(optimisticReportID);
    const appState = useRef(AppState.currentState);

    // const handleAppStateChange = (nextAppState: AppStateStatus) => {
    //     if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
    //         console.log('PROCESSED FILES ATTEMPT');

    //         ShareActionHandlerModule.processFiles((processedFiles) => {
    //             // eslint-disable-next-line no-console
    //             console.log('PROCESSED FILES ', processedFiles);
    //         });
    //     }

    //     appState.current = nextAppState;
    //     // eslint-disable-next-line no-console
    //     console.log('AppState', appState.current);
    // };

    // const handleAppStateFocus = (nextAppState: AppStateStatus) => {
    //     console.log('PROCESSED FILES ATTEMPT');

    //     ShareActionHandlerModule.processFiles((processedFiles) => {
    //         // eslint-disable-next-line no-console
    //         console.log('PROCESSED FILES ', processedFiles);
    //     });

    //     appState.current = nextAppState;
    //     // eslint-disable-next-line no-console
    //     console.log('AppState', appState.current);
    // };

    // useEffect(() => {
    //     const changeSubscription = Platform.OS === 'ios' ? AppState.addEventListener('change', handleAppStateChange) : AppState.addEventListener('focus', handleAppStateFocus);

    //     return () => {
    //         changeSubscription.remove();
    //     };
    // }, []);

    const navigateBack = () => {
        Navigation.dismissModal();
    };

    const goToNextStep = useCallback(() => {
        // const nextStepIOUType = numberOfParticipants.current === 1 ? CONST.IOU.TYPE.REQUEST : CONST.IOU.TYPE.SPLIT;
        const nextStepIOUType = CONST.IOU.TYPE.REQUEST;
        IOU.startMoneyRequest_temporaryForRefactor(optimisticReportID, false, CONST.IOU.REQUEST_TYPE.SCAN);
        IOU.setMoneyRequestTag(transactionID, '');
        IOU.resetMoneyRequestCategory_temporaryForRefactor(transactionID);
        Navigation.navigate(ROUTES.SHARE_SCAN_CONFIRM.getRoute(nextStepIOUType, transactionID, selectedReportID.current || optimisticReportID));
    }, [transactionID, optimisticReportID]);

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableKeyboardAvoidingView={false}
            shouldEnableMinHeight={DeviceCapabilities.canUseTouchScreen()}
            testID={ShareRootPage.displayName}
        >
            <View style={[styles.flex1]}>
                <HeaderWithBackButton
                    title={translate('share.title')}
                    onBackButtonPress={navigateBack}
                />
                <OnyxTabNavigator
                    id={CONST.TAB.SHARE_TAB_ID}
                    // @ts-expect-error I think that OnyxTabNavigator is going to be refactored in terms of types
                    selectedTab={fileIsScannable && selectedTab ? selectedTab : CONST.TAB.SHARE}
                    hideTabBar={!fileIsScannable}
                    // @ts-expect-error I think that OnyxTabNavigator is going to be refactored in terms of types
                    tabBar={({state, navigation, position}) => (
                        <TabSelector
                            state={state}
                            navigation={navigation}
                            position={position}
                        />
                    )}
                >
                    <TopTab.Screen name={CONST.TAB.SHARE}>
                        {() => (
                            <MoneyRequestParticipantsSelector
                                participants={iou?.participants ?? []}
                                onAddParticipants={IOU.setMoneyRequestParticipants}
                                onFinish={goToNextStep}
                                navigateToRequest={goToNextStep}
                                navigateToSplit={goToNextStep}
                                iouType={CONST.IOU.TYPE.REQUEST}
                                iouRequestType={CONST.IOU.REQUEST_TYPE.MANUAL}
                            />
                        )}
                    </TopTab.Screen>
                    <TopTab.Screen name={CONST.TAB.SCAN}>
                        {() => (
                            <MoneyRequestParticipantsSelector
                                participants={iou?.participants ?? []}
                                onAddParticipants={IOU.setMoneyRequestParticipants}
                                onFinish={goToNextStep}
                                navigateToRequest={goToNextStep}
                                navigateToSplit={goToNextStep}
                                iouType={CONST.IOU.TYPE.REQUEST}
                                iouRequestType={CONST.IOU.REQUEST_TYPE.SCAN}
                                isScanRequest
                            />
                        )}
                    </TopTab.Screen>
                </OnyxTabNavigator>
            </View>
        </ScreenWrapper>
    );
}

ShareRootPage.displayName = 'ShareRootPage';
