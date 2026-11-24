/**
 * The one loader of the onboarding pages. The flow shows it for the one render before it replaces a missing, unknown or
 * skipped step, and a step or page shows it while the data it renders is not there yet. The header of the step stays
 * above it, so Back still leaves the page.
 */
import ActivityIndicator from '@components/ActivityIndicator';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

function PageLoadingIndicator() {
    const styles = useThemeStyles();
    return (
        <View style={[styles.flex1, styles.fullScreenLoading]}>
            <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
        </View>
    );
}

export default PageLoadingIndicator;
