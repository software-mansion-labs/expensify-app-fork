import type {ReactNode} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

type FullScreenAmountLayoutProps = {
    /** `FullScreenAmountLayout.Body` followed by `FullScreenAmountLayout.Footer`. */
    children: ReactNode;

    /** Additional styles applied to the outer container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the outer container. */
    testID?: string;
};

type FullScreenAmountLayoutBodyProps = {
    /** `FullScreenAmountLayout.Main` followed by `FullScreenAmountLayout.Pad`. */
    children: ReactNode;

    /** Additional styles applied to the body content. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the body. */
    testID?: string;
};

type FullScreenAmountLayoutMainProps = {
    /** The amount (`NumericInput.Container`), its actions, error, and any contextual content. */
    children: ReactNode;

    /** Additional styles applied to the main column. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the main column. */
    testID?: string;
};

type FullScreenAmountLayoutPadProps = {
    /** The touch number pad, typically `NumericInput.BigNumberPad`. */
    children: ReactNode;

    /** Additional styles applied to the pad container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the pad container. */
    testID?: string;
};

type FullScreenAmountLayoutFooterProps = {
    /** The footer content, typically the submit Button. */
    children: ReactNode;

    /** Additional styles applied to the footer container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the footer container. */
    testID?: string;
};

type FullScreenAmountLayoutContextValue = {
    /** Whether the body splits into two columns (amount on the left, number pad on the right). True only on phones in landscape. */
    isTwoColumn: boolean;
};

export type {
    FullScreenAmountLayoutBodyProps,
    FullScreenAmountLayoutContextValue,
    FullScreenAmountLayoutFooterProps,
    FullScreenAmountLayoutMainProps,
    FullScreenAmountLayoutPadProps,
    FullScreenAmountLayoutProps,
};
