import React from 'react';
import ButtonLoadingIndicator from '@components/ComposableButton/primitives/ButtonLoadingIndicator';
import ButtonText from '@components/ComposableButton/primitives/ButtonText';
import type {ButtonWrapperProps} from '@components/ComposableButton/primitives/ButtonWrapper';
import ButtonWrapper from '@components/ComposableButton/primitives/ButtonWrapper';

type LinkButtonProps = Omit<ButtonWrapperProps, 'children' | 'variant'> & {
    text: string;
};

function LinkButton({text, ...wrapperProps}: LinkButtonProps) {
    return (
        <ButtonWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...wrapperProps}
            variant="link"
        >
            <ButtonText text={text} />
            <ButtonLoadingIndicator />
        </ButtonWrapper>
    );
}

export default LinkButton;
export type {LinkButtonProps};
