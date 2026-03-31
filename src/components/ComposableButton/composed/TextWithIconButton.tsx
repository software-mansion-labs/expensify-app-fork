import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import ButtonAlignLeftText from '@components/ComposableButton/primitives/ButtonAlignLeftText';
import ButtonIconLeft from '@components/ComposableButton/primitives/ButtonIconLeft';
import ButtonLoadingIndicator from '@components/ComposableButton/primitives/ButtonLoadingIndicator';
import type {ButtonWrapperProps} from '@components/ComposableButton/primitives/ButtonWrapper';
import ButtonWrapper from '@components/ComposableButton/primitives/ButtonWrapper';
import type {ButtonSize} from '@components/ComposableButton/types';
import type IconAsset from '@src/types/utils/IconAsset';

const ICON_SIDE_PADDING: Partial<Record<ButtonSize, number>> = {
    small: 8,
    medium: 12,
    large: 16,
};

type TextWithIconButtonProps = Omit<ButtonWrapperProps, 'children'> & {
    text: string;
    icon: IconAsset;
};

function TextWithIconButton({text, icon, innerStyles, ...wrapperProps}: TextWithIconButtonProps) {
    const size = wrapperProps.size ?? 'medium';
    const paddingLeft = ICON_SIDE_PADDING[size];
    const paddingOverride: StyleProp<ViewStyle> = paddingLeft !== undefined ? [{paddingLeft}, innerStyles] : innerStyles;

    return (
        <ButtonWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...wrapperProps}
            innerStyles={paddingOverride}
        >
            <ButtonIconLeft src={icon} />
            <ButtonAlignLeftText text={text} />
            <ButtonLoadingIndicator />
        </ButtonWrapper>
    );
}

export default TextWithIconButton;
export type {TextWithIconButtonProps};
