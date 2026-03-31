import React from 'react';
import Text from '@components/Text';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import {useButtonContext} from './ButtonWrapperContext';

type ButtonAlignLeftTextProps = {
    text: string;
    numberOfLines?: number;
};

function ButtonAlignLeftText({text, numberOfLines = 1}: ButtonAlignLeftTextProps) {
    const {variant, size, isLoading, isHovered} = useButtonContext();
    const styles = useThemeStyles();
    const theme = useTheme();
    const StyleUtils = useStyleUtils();

    const sizeTextStyle = {
        extraSmall: styles.buttonExtraSmallText,
        small: styles.buttonSmallText,
        medium: styles.buttonMediumText,
        large: styles.buttonLargeText,
    }[size];

    const getVariantTextStyle = () => {
        if (variant === 'success') {
            return styles.buttonSuccessText;
        }
        if (variant === 'danger') {
            return styles.buttonDangerText;
        }
        if (variant === 'link') {
            return [styles.fontWeightNormal, styles.fontSizeLabel, styles.link, isHovered && StyleUtils.getColorStyle(theme.linkHover)];
        }
        return undefined;
    };

    const variantTextStyle = getVariantTextStyle();

    return (
        <Text
            numberOfLines={numberOfLines}
            style={[numberOfLines !== 1 && styles.breakAll, isLoading && styles.opacity0, styles.pointerEventsNone, styles.buttonText, sizeTextStyle, variantTextStyle, styles.textAlignLeft]}
            dataSet={{[CONST.SELECTION_SCRAPER_HIDDEN_ELEMENT]: true}}
        >
            {text}
        </Text>
    );
}

export default ButtonAlignLeftText;
export type {ButtonAlignLeftTextProps};
