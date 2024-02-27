import React, {useEffect, useRef} from 'react';
import type {AppStateStatus} from 'react-native';
import {AppState, View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TabSelector from '@components/TabSelector/TabSelector';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import Navigation from '@navigation/Navigation';
import OnyxTabNavigator, {TopTab} from '@navigation/OnyxTabNavigator';
import CONST from '@src/CONST';
import ShareExtensionHandlerModule from '@src/modules/ShareExtensionHandlerModule';
import ONYXKEYS from '@src/ONYXKEYS';
import ScanTab from './ScanTab';

type ShareRootPageOnyxProps = {
    selectedTab: OnyxEntry<string>;
};

type ShareRootPageProps = ShareRootPageOnyxProps;

function ShareRootPage({selectedTab}: ShareRootPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const fileIsScannable = false;
    const appState = useRef(AppState.currentState);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            ShareExtensionHandlerModule?.processFiles((processedFiles) => {
                // eslint-disable-next-line no-console
                console.log('PROCESSED FILES ', processedFiles);
            });
        }

        appState.current = nextAppState;
        // eslint-disable-next-line no-console
        console.log('AppState', appState.current);
    };

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            appStateSubscription.remove();
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
                    <TopTab.Screen name={CONST.TAB.SHARE}>{() => <Text>test</Text>}</TopTab.Screen>
                    <TopTab.Screen name={CONST.TAB.SCAN}>{() => <ScanTab />}</TopTab.Screen>
                </OnyxTabNavigator>
            </View>
        </ScreenWrapper>
    );
}

ShareRootPage.displayName = 'ShareRootPage';

export default withOnyx<ShareRootPageProps, ShareRootPageOnyxProps>({
    selectedTab: {
        key: `${ONYXKEYS.COLLECTION.SELECTED_TAB}${CONST.TAB.RECEIPT_TAB_ID}`,
    },
})(ShareRootPage);
