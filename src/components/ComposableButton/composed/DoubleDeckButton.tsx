import React from 'react';
import {View} from 'react-native';
import ButtonLoadingIndicator from '@components/ComposableButton/primitives/ButtonLoadingIndicator';
import ButtonSecondLineText from '@components/ComposableButton/primitives/ButtonSecondLineText';
import ButtonText from '@components/ComposableButton/primitives/ButtonText';
import type {ButtonWrapperProps} from '@components/ComposableButton/primitives/ButtonWrapper';
import ButtonWrapper from '@components/ComposableButton/primitives/ButtonWrapper';
import useThemeStyles from '@hooks/useThemeStyles';

type DoubleDeckButtonProps = Omit<ButtonWrapperProps, 'children'> & {
    text: string;
    secondLineText: string;
};

function DoubleDeckButton({text, secondLineText, ...wrapperProps}: DoubleDeckButtonProps) {
    const styles = useThemeStyles();

    return (
        <ButtonWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...wrapperProps}
        >
            <View style={[styles.alignItemsCenter, styles.flexColumn, styles.flexShrink1, styles.mw100]}>
                <ButtonText text={text} />
                <ButtonSecondLineText text={secondLineText} />
            </View>
            <ButtonLoadingIndicator />
        </ButtonWrapper>
    );
}

export default DoubleDeckButton;
export type {DoubleDeckButtonProps};
