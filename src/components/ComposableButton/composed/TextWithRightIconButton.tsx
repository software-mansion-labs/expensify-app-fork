import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import ButtonIconRight from '@components/ComposableButton/primitives/ButtonIconRight';
import ButtonLoadingIndicator from '@components/ComposableButton/primitives/ButtonLoadingIndicator';
import ButtonText from '@components/ComposableButton/primitives/ButtonText';
import type {ButtonWrapperProps} from '@components/ComposableButton/primitives/ButtonWrapper';
import ButtonWrapper from '@components/ComposableButton/primitives/ButtonWrapper';
import type {ButtonSize} from '@components/ComposableButton/types';
import type IconAsset from '@src/types/utils/IconAsset';

const ICON_SIDE_PADDING: Partial<Record<ButtonSize, number>> = {
    small: 8,
    medium: 12,
    large: 16,
};

type TextWithRightIconButtonProps = Omit<ButtonWrapperProps, 'children'> & {
    text: string;
    iconRight?: IconAsset;
};

function TextWithRightIconButton({text, iconRight, innerStyles, ...wrapperProps}: TextWithRightIconButtonProps) {
    const size = wrapperProps.size ?? 'medium';
    const paddingRight = ICON_SIDE_PADDING[size];
    const paddingOverride: StyleProp<ViewStyle> = paddingRight !== undefined ? [{paddingRight}, innerStyles] : innerStyles;

    return (
        <ButtonWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...wrapperProps}
            innerStyles={paddingOverride}
        >
            <ButtonText text={text} />
            <ButtonIconRight src={iconRight} />
            <ButtonLoadingIndicator />
        </ButtonWrapper>
    );
}

export default TextWithRightIconButton;
export type {TextWithRightIconButtonProps};
