import React from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import type IconAsset from '@src/types/utils/IconAsset';
import {useButtonContext} from './ButtonWrapperContext';

type ButtonIconProps = {
    src: IconAsset;
};

function ButtonIcon({src}: ButtonIconProps) {
    const {variant, size, isLoading} = useButtonContext();
    const theme = useTheme();
    const styles = useThemeStyles();

    const fill = variant === 'success' || variant === 'danger' ? theme.textLight : theme.buttonIcon;

    return (
        <View style={isLoading && styles.opacity0}>
            <Icon
                src={src}
                fill={fill}
                extraSmall={size === 'extraSmall'}
                small={size === 'small'}
                medium={size === 'medium'}
                large={size === 'large'}
                isButtonIcon
            />
        </View>
    );
}

export default ButtonIcon;
export type {ButtonIconProps};
