import React from 'react';
// eslint-disable-next-line no-restricted-imports
import {Text as RNText} from 'react-native';
import type {TextProps as RNTextProps} from 'react-native';

type TextProps = RNTextProps & {
    children?: React.ReactNode;
};

function Text({children, ...props}: TextProps) {
    return <RNText {...props}>{children}</RNText>;
}

Text.displayName = 'Text';

export default Text;