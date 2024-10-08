import React, {useEffect, useRef} from 'react';
import type {AppStateStatus} from 'react-native';
import {AppState, View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TabSelector from '@components/TabSelector/TabSelector';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import {setShareFileData} from '@libs/actions/ShareFile';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import Navigation from '@navigation/Navigation';
import OnyxTabNavigator, {TopTab} from '@navigation/OnyxTabNavigator';
import CONST from '@src/CONST';
import ShareActionHandlerModule from '@src/modules/ShareActionHandlerModule';
import type {SharedFileData} from '@src/types/onyx/ShareFile';
import ScanTab from './ScanTab';
import ShareTab from './ShareTab';

function ShareRootPage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const appState = useRef(AppState.currentState);

    const handleProcessFiles = () => {
        ShareActionHandlerModule.processFiles((file) => {
            const processedFile = JSON.parse(file) as SharedFileData;

            // eslint-disable-next-line no-console
            console.log('PROCESS FILES ATTEMPT', file, processedFile);
            setShareFileData(processedFile);
        });
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            handleProcessFiles();
        }
        appState.current = nextAppState;
    };

    useEffect(() => {
        const changeSubscription = AppState.addEventListener('change', handleAppStateChange);

        handleProcessFiles();

        return () => {
            changeSubscription.remove();
        };
    }, []);

    const navigateBack = () => {
        Navigation.dismissModal();
    };

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
                    tabBar={TabSelector}
                >
                    <TopTab.Screen name={CONST.TAB.SHARE}>{() => <ShareTab />}</TopTab.Screen>
                    <TopTab.Screen name={CONST.TAB.SCAN}>{() => <ScanTab />}</TopTab.Screen>
                </OnyxTabNavigator>
            </View>
        </ScreenWrapper>
    );
}

ShareRootPage.displayName = 'ShareRootPage';

export default ShareRootPage;
