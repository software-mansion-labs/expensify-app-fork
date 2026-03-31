type ButtonVariant = 'default' | 'success' | 'danger' | 'link';

type ButtonSize = 'extraSmall' | 'small' | 'medium' | 'large';

type ButtonContextValue = {
    variant: ButtonVariant;
    size: ButtonSize;
    isDisabled: boolean;
    isLoading: boolean;
    isHovered: boolean;
};

export type {ButtonVariant, ButtonSize, ButtonContextValue};
