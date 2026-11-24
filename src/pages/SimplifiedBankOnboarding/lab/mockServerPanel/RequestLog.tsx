/**
 * The list of the last requests that reached the mock server, newest first. A failed request shows the message of the
 * server here, because the client only ever shows its own generic error.
 * It is a development tool, so its text is plain English and is not translated.
 */

import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import type {RequestLogEntry} from '@pages/SimplifiedBankOnboarding/mockBackend/types';

import React from 'react';
import {View} from 'react-native';

type RequestLogProps = {
    entries: RequestLogEntry[];
};

function RequestLog({entries}: RequestLogProps) {
    const styles = useThemeStyles();

    if (entries.length === 0) {
        return <Text style={[styles.textLabelSupporting, styles.mt2]}>No requests yet.</Text>;
    }

    return (
        <View style={[styles.mt2, styles.gap1]}>
            {entries.map((entry) => (
                <Text
                    key={entry.id}
                    style={styles.textLabelSupporting}
                >
                    {`#${entry.id} ${entry.type} ${entry.command}: ${entry.status}${entry.message ? ` (${entry.message})` : ''}`}
                </Text>
            ))}
        </View>
    );
}

export default RequestLog;
