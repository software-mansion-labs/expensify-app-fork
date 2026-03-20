import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

type ScreenBoxProps = {
    indexLabel: string;
    screenName: string;
    note?: string;
    color: string;
    flex?: number;
    faded?: boolean;
};

function ScreenBox({indexLabel, screenName, note, color, flex, faded = false}: ScreenBoxProps) {
    return (
        <View
            style={[
                {
                    backgroundColor: color,
                    borderRadius: 10,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 90,
                    opacity: faded ? 0.35 : 1,
                    flex,
                },
            ]}
        >
            <Text style={{color: 'white', fontSize: 13, opacity: 0.85, marginBottom: 4}}>{indexLabel}</Text>
            <Text style={{color: 'white', fontSize: 17, fontWeight: '700', textAlign: 'center'}}>{screenName}</Text>
            {!!note && <Text style={{color: 'white', fontSize: 13, opacity: 0.85, marginTop: 6, textAlign: 'center'}}>{note}</Text>}
        </View>
    );
}

type DiagramPanelProps = {
    title: string;
    children: React.ReactNode;
};

function DiagramPanel({title, children}: DiagramPanelProps) {
    const theme = useTheme();

    return (
        <View
            style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.highlightBG,
                padding: 16,
                gap: 14,
            }}
        >
            <Text style={{color: theme.text, fontSize: 17, fontWeight: '600'}}>{title}</Text>
            {children}
        </View>
    );
}

function SplitNavigatorDiagram() {
    const styles = useThemeStyles();
    const theme = useTheme();

    return (
        <View style={[styles.mv3, {gap: 12}]}>
            {/* Narrow layout */}
            <DiagramPanel title="Wąski ekran (telefon) — zwykły stos">
                <View style={{gap: 6}}>
                    <ScreenBox
                        indexLabel="routes[0]"
                        screenName="SidebarScreen"
                        note="ukryty pod spodem"
                        color="#166534"
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[1]"
                        screenName="CentralScreen"
                        note="widoczny"
                        color="#16a34a"
                    />
                </View>
                <Text style={{color: theme.textSupporting, fontSize: 14, marginTop: 4}}>
                    Na wąskim ekranie widoczny jest tylko ekran na szczycie stosu. Sidebar leży pod spodem i można do niego wrócić gestem cofnięcia.
                </Text>
            </DiagramPanel>

            {/* Wide layout — single central */}
            <DiagramPanel title="Szeroki ekran — jeden ekran centralny">
                <View style={{flexDirection: 'row', gap: 8}}>
                    <ScreenBox
                        indexLabel="routes[0]  ← zawsze pierwszy"
                        screenName="SidebarScreen"
                        color="#166534"
                        flex={2}
                    />
                    <ScreenBox
                        indexLabel="routes[1]  ← widoczny"
                        screenName="CentralScreen"
                        color="#16a34a"
                        flex={3}
                    />
                </View>
                <Text style={{color: theme.textSupporting, fontSize: 14, marginTop: 4}}>
                    Na szerokim ekranie SplitNavigator renderuje oba ekrany jednocześnie obok siebie. SidebarScreen musi być zawsze na indeksie 0 — to gwarantuje adaptStateIfNecessary.
                </Text>
            </DiagramPanel>

            {/* Wide layout — multiple central screens */}
            <DiagramPanel title="Szeroki ekran — wiele ekranów centralnych w stosie">
                <View style={{flexDirection: 'row', gap: 8}}>
                    <ScreenBox
                        indexLabel="routes[0]  ← zawsze pierwszy"
                        screenName="SidebarScreen"
                        color="#166534"
                        flex={2}
                    />
                    <ScreenBox
                        indexLabel="routes[1]"
                        screenName="CentralScreen A"
                        note="poprzedni"
                        color="#166534"
                        flex={3}
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[2]  ← widoczny"
                        screenName="CentralScreen B"
                        note="aktualny"
                        color="#16a34a"
                        flex={3}
                    />
                </View>
                <Text style={{color: theme.textSupporting, fontSize: 14, marginTop: 4}}>
                    Ekranów centralnych może być wiele — każde wejście w głąb (np. szczegóły → edycja) dokłada kolejny do stosu. Lewa kolumna pozostaje ta sama. Przycisk &quot;wstecz&quot; zdejmuje tylko ekrany centralne, aż do momentu gdy zostanie tylko sidebar — wtedy cofa cały navigator.
                </Text>
            </DiagramPanel>
        </View>
    );
}

export default SplitNavigatorDiagram;
