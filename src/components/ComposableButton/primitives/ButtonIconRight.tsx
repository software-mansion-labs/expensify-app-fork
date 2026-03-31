import React from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import type IconAsset from '@src/types/utils/IconAsset';
import {useButtonContext} from './ButtonWrapperContext';

type ButtonIconRightProps = {
    src?: IconAsset;
};

function ButtonIconRight({src}: ButtonIconRightProps) {
    const {variant, size, isLoading} = useButtonContext();
    const theme = useTheme();
    const styles = useThemeStyles();
    const icons = useMemoizedLazyExpensifyIcons(['ArrowRight']);

    const fill = variant === 'success' || variant === 'danger' ? theme.textLight : theme.buttonIcon;
    const iconSrc = src ?? icons.ArrowRight;

    return (
        <View style={isLoading ? styles.opacity0 : undefined}>
            <Icon
                src={iconSrc}
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

export default ButtonIconRight;
export type {ButtonIconRightProps};
