import React from 'react';
import HeaderWithBackButton from "@components/HeaderWithBackButton";
import Navigation from "@navigation/Navigation";
import * as DeviceCapabilities from "@libs/DeviceCapabilities";
import ScreenWrapper from '@components/ScreenWrapper';
import {View} from "react-native";
import useThemeStyles from "@hooks/useThemeStyles";
import useLocalize from "@hooks/useLocalize";
import type {OnyxEntry} from "react-native-onyx";
import { withOnyx} from "react-native-onyx";
import ONYXKEYS from "@src/ONYXKEYS";
import CONST from "@src/CONST";
import OnyxTabNavigator, {TopTab} from "@navigation/OnyxTabNavigator";
import TabSelector from "@components/TabSelector/TabSelector";
import MoneyRequestParticipantsSelector
    from "@pages/iou/steps/MoneyRequstParticipantsPage/MoneyRequestParticipantsSelector";
import * as IOU from "@libs/actions/IOU";
import type {Report} from "@src/types/onyx";
import ROUTES from "@src/ROUTES";

type ShareRootPageOnyxProps = {
    selectedTab: OnyxEntry<string>;

    iou: OnyxEntry<Report>;
};

type ShareRootPageProps = ShareRootPageOnyxProps;

function ShareRootPage({selectedTab, iou}: ShareRootPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const fileIsScannable = false;

    const navigateBack = () => {
        Navigation.dismissModal();
    };

    const navigateToConfirmationStep = (moneyRequestType: string) => {
        IOU.setMoneyRequestId(moneyRequestType);
        IOU.resetMoneyRequestCategory();
        Navigation.navigate(ROUTES.MONEY_REQUEST_CONFIRMATION.getRoute(moneyRequestType, reportID));
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
                    <TopTab.Screen
                        name={CONST.TAB.SHARE}
                    >{() => (
                        <MoneyRequestParticipantsSelector
                            participants={iou?.participants ?? []}
                            onAddParticipants={IOU.setMoneyRequestParticipants}
                            navigateToRequest={() => navigateToConfirmationStep(CONST.IOU.TYPE.REQUEST)}
                            navigateToSplit={() => navigateToConfirmationStep(CONST.IOU.TYPE.SPLIT)}
                            iouType={CONST.IOU.TYPE.REQUEST}
                            isScanRequest
                        />
                    )}</TopTab.Screen>
                    <TopTab.Screen
                        name={CONST.TAB.SCAN}
                    >{() => (
                        <MoneyRequestParticipantsSelector
                            participants={iou?.participants ?? []}
                            onAddParticipants={IOU.setMoneyRequestParticipants}
                            navigateToRequest={() => navigateToConfirmationStep(CONST.IOU.TYPE.REQUEST)}
                            navigateToSplit={() => navigateToConfirmationStep(CONST.IOU.TYPE.SPLIT)}
                            iouType={CONST.IOU.TYPE.REQUEST}
                            isScanRequest
                        />
                    )}</TopTab.Screen>
                </OnyxTabNavigator>
            </View>
        </ScreenWrapper>
    );
}

ShareRootPage.displayName = 'ShareRootPage';

export default withOnyx<ShareRootPageProps, ShareRootPageOnyxProps>({
    iou: {
        key: ONYXKEYS.IOU,
    },
    selectedTab: {
        key: `${ONYXKEYS.COLLECTION.SELECTED_TAB}${CONST.TAB.RECEIPT_TAB_ID}`,
    },
})(ShareRootPage);;
