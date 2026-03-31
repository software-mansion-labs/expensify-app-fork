import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import {useButtonContext} from './ButtonWrapperContext';

type ButtonSecondLineTextProps = {
    text: string;
};

function ButtonSecondLineText({text}: ButtonSecondLineTextProps) {
    const {isLoading} = useButtonContext();
    const styles = useThemeStyles();

    return (
        <Text
            numberOfLines={1}
            style={[
                isLoading && styles.opacity0,
                styles.pointerEventsNone,
                styles.fontWeightNormal,
                styles.textDoubleDecker,
                styles.textExtraSmallSupporting,
                styles.textWhite,
                styles.textBold,
            ]}
        >
            {text}
        </Text>
    );
}

export default ButtonSecondLineText;
export type {ButtonSecondLineTextProps};
