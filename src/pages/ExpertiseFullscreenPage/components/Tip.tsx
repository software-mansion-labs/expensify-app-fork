import React from 'react';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

type TipProps = {
    number: number;
    heading: string;
    body: string;
    code?: string;
    children?: ReactNode;
};

function Tip({number, heading, body, code, children}: TipProps) {
    const styles = useThemeStyles();
    const theme = useTheme();

    return (
        <View style={[styles.pv3, styles.borderBottom]}>
            <View style={[styles.flexRow, styles.mb1, {gap: 10, alignItems: 'center'}]}>
                <View
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#166534',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{color: 'white', fontWeight: '700', fontSize: 14}}>{String(number)}</Text>
                </View>
                <Text style={[styles.textStrong, {fontSize: 20}]}>{heading}</Text>
            </View>
            <Text style={[styles.textSupporting, {fontSize: 18}]}>{body}</Text>
            {!!code && (
                <View
                    style={{
                        marginTop: 10,
                        backgroundColor: theme.cardBG,
                        borderRadius: 8,
                        padding: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: '#166534',
                    }}
                >
                    <Text style={{fontFamily: 'monospace', fontSize: 13, color: theme.text, lineHeight: 20}}>{code}</Text>
                </View>
            )}
            {children}
        </View>
    );
}

export type {TipProps};
export default Tip;
