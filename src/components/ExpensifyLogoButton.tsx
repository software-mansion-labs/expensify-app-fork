import React, {memo, useRef} from 'react';
import type {View} from 'react-native';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import CONST from '@src/CONST';
import * as Expensicons from './Icon/Expensicons';
import {PressableWithFeedback} from './Pressable';
import SubscriptAvatar from './SubscriptAvatar';

type ExpensifyLogoButtonProps = {
    onPress: () => void;
};

const avatar = {source: Expensicons.ExpensifyAppIcon, name: CONST.WORKSPACE_SWITCHER.NAME, type: CONST.ICON_TYPE_AVATAR};

function ExpensifyLogoButton({onPress}: ExpensifyLogoButtonProps) {
    const {translate} = useLocalize();
    const theme = useTheme();

    const pressableRef = useRef<View>(null);
    return (
        <PressableWithFeedback
            ref={pressableRef}
            accessibilityRole={CONST.ROLE.BUTTON}
            accessibilityLabel={translate('common.workspaces')}
            accessible
            testID="ExpensifyLogoButton"
            onPress={() => {
                pressableRef?.current?.blur();
                onPress();
            }}
        >
            {({hovered}) => (
                <SubscriptAvatar
                    mainAvatar={avatar}
                    showTooltip={false}
                    noMargin
                    subscriptionContainerAdditionalStyles={hovered && {backgroundColor: theme.buttonHoveredBG}}
                />
            )}
        </PressableWithFeedback>
    );
}

ExpensifyLogoButton.displayName = 'ExpensifyLogoButton';

export default memo(ExpensifyLogoButton);
