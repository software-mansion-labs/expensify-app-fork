/**
 * The loader that a step shows while `useSubPage` redirects from a URL without a sub page to the one the step starts from.
 */
import ActivityIndicator from '@components/ActivityIndicator';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

function SubPageRedirectIndicator() {
    const styles = useThemeStyles();
    return (
        <View style={[styles.flex1, styles.fullScreenLoading]}>
            <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
        </View>
    );
}

export default SubPageRedirectIndicator;
