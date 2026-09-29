import type {NumericInputFooterProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

/**
 * Layout container for the footer (e.g. submit CTA button) at the bottom of the screen.
 */
function NumericInputFooter({children, style}: NumericInputFooterProps) {
    const styles = useThemeStyles();

    return <View style={[styles.w100, styles.justifyContentEnd, styles.pageWrapper, styles.pt0, style]}>{children}</View>;
}

export default NumericInputFooter;
