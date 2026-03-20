import React from 'react';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';

const COLORS = {
    box: '#166534',
    arrow: '#6b7280',
};

function Arrow() {
    return (
        <View style={{alignItems: 'center', paddingVertical: 2}}>
            <View style={{width: 2, height: 14, backgroundColor: COLORS.arrow}} />
            <Text style={{fontSize: 10, color: COLORS.arrow, lineHeight: 10}}>▼</Text>
        </View>
    );
}

type FlowBoxProps = {
    color: string;
    children: ReactNode;
};

function FlowBox({color, children}: FlowBoxProps) {
    return (
        <View
            style={{
                backgroundColor: color,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
            }}
        >
            {children}
        </View>
    );
}

type FlowTextProps = {
    children: ReactNode;
    bold?: boolean;
    small?: boolean;
    dim?: boolean;
};

function FlowText({children, bold, small, dim}: FlowTextProps) {
    return (
        <Text
            style={{
                color: dim ? 'rgba(255,255,255,0.7)' : 'white',
                fontSize: small ? 13 : 15,
                fontWeight: bold ? '700' : '400',
                lineHeight: small ? 18 : 22,
            }}
        >
            {children}
        </Text>
    );
}

function RelationRow({label, value}: {label: string; value: string}) {
    const theme = useTheme();
    return (
        <View style={{flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border}}>
            <Text style={{flex: 1, fontSize: 13, color: theme.textSupporting, fontFamily: 'monospace'}}>{label}</Text>
            <Text style={{fontSize: 13, color: '#7c3aed', fontWeight: '700'}}>→</Text>
            <Text style={{flex: 1, fontSize: 13, color: theme.text, fontFamily: 'monospace'}}>{value}</Text>
        </View>
    );
}

function RelationsDiagram() {
    const theme = useTheme();
    return (
        <View style={{gap: 2, marginVertical: 12}}>
            <FlowBox color={COLORS.box}>
                <FlowText bold>URL: /settings/profile/display-name</FlowText>
                <FlowText
                    small
                    dim
                >
                    Jedyne źródło prawdy po odświeżeniu strony
                </FlowText>
            </FlowBox>

            <Arrow />

            <FlowBox color={COLORS.box}>
                <FlowText bold>getStateFromPath(path)</FlowText>
                <FlowText
                    small
                    dim
                >
                    {'React Navigation parsuje URL → wie tylko o ekranie RHP\nRight Modal Navigator › Settings › DISPLAY_NAME'}
                </FlowText>
            </FlowBox>

            <Arrow />

            <FlowBox color={COLORS.box}>
                <FlowText bold>⚠ Problem: brak ekranu full-screen w tle</FlowText>
                <FlowText
                    small
                    dim
                >
                    {'RHP to nakładka — musi być wyświetlany nad czymś.\nReact Navigation nie wie, co powinno być pod spodem.'}
                </FlowText>
            </FlowBox>

            <Arrow />

            <FlowBox color={COLORS.box}>
                <FlowText bold>getMatchingFullScreenRoute(focusedRoute)</FlowText>
                <FlowText
                    small
                    dim
                >
                    {'Przeszukuje tablice RELATIONS:\nRHP_TO_SETTINGS["Settings_ProfileDisplayName"] → "Settings_Profile_Root"'}
                </FlowText>
            </FlowBox>

            <Arrow />

            <View style={{gap: 8}}>
                <Text style={{color: theme.textSupporting, fontSize: 13, fontWeight: '700', textAlign: 'center'}}>Wynik lookup w RELATIONS ↓</Text>
                <View style={{backgroundColor: theme.cardBG, borderRadius: 8, padding: 12, gap: 2}}>
                    <RelationRow
                        label="DISPLAY_NAME"
                        value="PROFILE.ROOT"
                    />
                    <RelationRow
                        label="AVATAR"
                        value="PROFILE.ROOT"
                    />
                    <RelationRow
                        label="TWO_FACTOR_AUTH"
                        value="SECURITY"
                    />
                    <RelationRow
                        label="SUBSCRIPTION.SIZE"
                        value="SUBSCRIPTION.ROOT"
                    />
                </View>
            </View>

            <Arrow />

            <FlowBox color={COLORS.box}>
                <FlowText bold>Kompletny stan nawigacji</FlowText>
                <FlowText
                    small
                    dim
                >
                    {'[SETTINGS_SPLIT_NAVIGATOR, RIGHT_MODAL_NAVIGATOR]\n Użytkownik widzi Settings w tle + otwarty RHP'}
                </FlowText>
            </FlowBox>
        </View>
    );
}

export default RelationsDiagram;
