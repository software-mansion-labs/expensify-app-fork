import React from 'react';
import ActivityIndicator from '@components/ActivityIndicator';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import type {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';
import {useButtonContext} from './ButtonWrapperContext';

const LOADING_REASON_ATTRIBUTES: SkeletonSpanReasonAttributes = {
    context: 'ComposableButton',
};

function ButtonLoadingIndicator() {
    const {variant, size, isLoading} = useButtonContext();
    const theme = useTheme();
    const styles = useThemeStyles();

    if (!isLoading) {
        return null;
    }

    const color = variant === 'success' || variant === 'danger' ? theme.textLight : theme.text;
    const indicatorSize = size === 'extraSmall' ? 12 : undefined;

    return (
        <ActivityIndicator
            color={color}
            style={[styles.pAbsolute, styles.l0, styles.r0]}
            size={indicatorSize}
            reasonAttributes={LOADING_REASON_ATTRIBUTES}
        />
    );
}

export default ButtonLoadingIndicator;
