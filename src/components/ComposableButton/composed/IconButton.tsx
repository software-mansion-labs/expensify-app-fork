import React from 'react';
import ButtonIcon from '@components/ComposableButton/primitives/ButtonIcon';
import ButtonLoadingIndicator from '@components/ComposableButton/primitives/ButtonLoadingIndicator';
import type {ButtonWrapperProps} from '@components/ComposableButton/primitives/ButtonWrapper';
import ButtonWrapper from '@components/ComposableButton/primitives/ButtonWrapper';
import type IconAsset from '@src/types/utils/IconAsset';

type IconButtonProps = Omit<ButtonWrapperProps, 'children'> & {
    icon: IconAsset;
};

const ICON_ONLY_STYLE = {paddingHorizontal: 0} as const;

function IconButton({icon, ...wrapperProps}: IconButtonProps) {
    return (
        <ButtonWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...wrapperProps}
            innerStyles={ICON_ONLY_STYLE}
        >
            <ButtonIcon src={icon} />
            <ButtonLoadingIndicator />
        </ButtonWrapper>
    );
}

export default IconButton;
export type {IconButtonProps};
