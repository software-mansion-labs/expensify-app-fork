/** The screen of every entry view: a ScreenWrapper with the header "Add bank account" and its Back */
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';

import type ChildrenProps from '@src/types/utils/ChildrenProps';

import React from 'react';

type EntryScreenFrameProps = ChildrenProps & {
    /** The wrapper ID of the view, which the tests and the lab README name */
    testID: string;

    /** The workspace name, shown under the title */
    subtitle?: string;
    onBackButtonPress: () => void;

    /** The views with rows leave the bottom inset to their scroll view */
    includeSafeAreaPaddingBottom?: boolean;
    shouldShowOfflineIndicatorInWideScreen?: boolean;
    shouldEnablePickerAvoiding?: boolean;
    shouldEnableMaxHeight?: boolean;
};

function EntryScreenFrame({
    testID,
    subtitle,
    onBackButtonPress,
    includeSafeAreaPaddingBottom,
    shouldShowOfflineIndicatorInWideScreen,
    shouldEnablePickerAvoiding,
    shouldEnableMaxHeight,
    children,
}: EntryScreenFrameProps) {
    const {translate} = useLocalize();

    return (
        <ScreenWrapper
            testID={testID}
            includeSafeAreaPaddingBottom={includeSafeAreaPaddingBottom}
            shouldShowOfflineIndicatorInWideScreen={shouldShowOfflineIndicatorInWideScreen}
            shouldEnablePickerAvoiding={shouldEnablePickerAvoiding}
            shouldEnableMaxHeight={shouldEnableMaxHeight}
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                subtitle={subtitle}
                onBackButtonPress={onBackButtonPress}
            />
            {children}
        </ScreenWrapper>
    );
}

export default EntryScreenFrame;
export type {EntryScreenFrameProps};
