import React from 'react';
import ButtonLoadingIndicator from '@components/ComposableButton/primitives/ButtonLoadingIndicator';
import ButtonText from '@components/ComposableButton/primitives/ButtonText';
import type {ButtonWrapperProps} from '@components/ComposableButton/primitives/ButtonWrapper';
import ButtonWrapper from '@components/ComposableButton/primitives/ButtonWrapper';

type TextButtonProps = Omit<ButtonWrapperProps, 'children'> & {
    text: string;
};

function TextButton({text, ...wrapperProps}: TextButtonProps) {
    return (
        <ButtonWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...wrapperProps}
        >
            <ButtonText text={text} />
            <ButtonLoadingIndicator />
        </ButtonWrapper>
    );
}

export default TextButton;
export type {TextButtonProps};
