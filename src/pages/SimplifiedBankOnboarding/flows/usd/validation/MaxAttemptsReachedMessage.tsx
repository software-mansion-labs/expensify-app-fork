/**
 * The message that blocks the test deposit form after too many wrong amounts. The real message links to a chat with
 * Concierge, which the lab does not have, so it only shows the text.
 */
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';
import {View} from 'react-native';

function MaxAttemptsReachedMessage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <View style={[styles.m5, styles.flex1]}>
            <Text>{translate('connectBankAccountStep.maxAttemptsReached')}</Text>
        </View>
    );
}

export default MaxAttemptsReachedMessage;
