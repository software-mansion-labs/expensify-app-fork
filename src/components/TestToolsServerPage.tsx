/**
 * The test tools modal is the only test tools host on the unauthenticated sign-in screen, so the selector needs
 * a home there. ScreenWrapper's device safe areas do not apply to this floating card.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import ServerSelector from '@pages/settings/Troubleshoot/ServerSelector';

import React from 'react';
import {View} from 'react-native';

function TestToolsServerPage() {
    const styles = useThemeStyles();

    return (
        <View style={[styles.h100, styles.defaultModalContainer]}>
            <ServerSelector />
        </View>
    );
}

export default TestToolsServerPage;
