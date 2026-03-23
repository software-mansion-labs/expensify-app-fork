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
                        color="#166534"
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[1]"
                        screenName="CentralScreen A"
                        color="#166534"
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[2]"
                        screenName="CentralScreen B"
                        color="#166534"
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[3]  ← widoczny"
                        screenName="CentralScreen C"
                        color="#16a34a"
                    />
                </View>
                <Text style={{color: theme.textSupporting, fontSize: 14, marginTop: 4}}>
                    Na wąskim ekranie widoczny jest tylko ekran na szczycie stosu. Sidebar i poprzednie ekrany centralne leżą pod spodem — można do nich wrócić gestem cofnięcia.
                </Text>
            </DiagramPanel>

            {/* Wide layout — sidebar active */}
            <DiagramPanel title="Szeroki ekran — zwykły stos ale pierwszy route (sidebar) jest zawsze renderowany po lewej stronie ekranu">
                <View style={{gap: 6}}>
                    <ScreenBox
                        indexLabel="routes[0]  ← widoczny"
                        screenName="SidebarScreen"
                        color="#16a34a"
                    />
                    <ScreenBox
                        indexLabel="routes[1]"
                        screenName="CentralScreen A"
                        color="#166534"
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[2]"
                        screenName="CentralScreen B"
                        color="#166534"
                        faded
                    />
                    <ScreenBox
                        indexLabel="routes[3]"
                        screenName="CentralScreen C"
                        color="#16a34a"
                    />
                </View>
                <Text style={{color: theme.textSupporting, fontSize: 14, marginTop: 4}}>
                    Gdy aktywny jest routes[0] (SidebarScreen), sidebar jest podświetlony po lewej, a prawy panel pokazuje ostatni ekran centralny ze stosu (lub pusty ekran zastępczy, jeśli żadnego nie ma).
                </Text>
            </DiagramPanel>

            {/* Wide layout */}
            <DiagramPanel title="Szeroki ekran — zwykły stos ale pierwszy route (sidebar) jest zawsze renderowany po lewej stronie ekranu">
                <View style={{flexDirection: 'row', gap: 8, alignItems: 'stretch'}}>
                    <View style={{flex: 2}}>
                        <ScreenBox
                            indexLabel="routes[0]  ← zawsze pierwszy"
                            screenName="SidebarScreen"
                            color="#16a34a"
                        />
                    </View>
                    <View style={{flex: 3, gap: 6}}>
                        <ScreenBox
                            indexLabel="routes[1]"
                            screenName="CentralScreen A"
                            color="#166534"
                            faded
                        />
                        <ScreenBox
                            indexLabel="routes[2]"
                            screenName="CentralScreen B"
                            color="#166534"
                            faded
                        />
                        <ScreenBox
                            indexLabel="routes[3]  ← widoczny"
                            screenName="CentralScreen C"
                            color="#16a34a"
                        />
                    </View>
                </View>
                <Text style={{color: theme.textSupporting, fontSize: 14, marginTop: 4}}>
                    Na szerokim ekranie sidebar i aktywny ekran centralny są widoczne jednocześnie. Poprzednie ekrany centralne pozostają w stosie — przycisk &quot;wstecz&quot; zdejmuje je
                    jeden po drugim.
                </Text>
            </DiagramPanel>
        </View>
    );
}

export default SplitNavigatorDiagram;
