import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';

type MiniScreenProps = {
    label: string;
    sublabel?: string;
    color: string;
    flex?: number;
    faded?: boolean;
};

function MiniScreen({label, sublabel, color, flex, faded = false}: MiniScreenProps) {
    return (
        <View
            style={{
                backgroundColor: color,
                borderRadius: 6,
                paddingVertical: 10,
                paddingHorizontal: 8,
                alignItems: 'center',
                justifyContent: 'center',
                flex,
                opacity: faded ? 0.4 : 1,
            }}
        >
            <Text style={{color: 'white', fontSize: 12, fontWeight: '700', textAlign: 'center'}}>{label}</Text>
            {!!sublabel && <Text style={{color: 'rgba(255,255,255,0.75)', fontSize: 11, textAlign: 'center', marginTop: 2}}>{sublabel}</Text>}
        </View>
    );
}

type RouteKind = 'split' | 'fullscreen' | 'screen' | 'modal';

const KIND_LABEL: Record<RouteKind, string> = {
    split: 'SplitNavigator',
    fullscreen: 'FullscreenNavigator',
    screen: 'pojedyncza strona',
    modal: 'modal',
};

const KIND_COLOR: Record<RouteKind, string> = {
    split: '#1d4ed8',
    fullscreen: '#0369a1',
    screen: '#6b7280',
    modal: '#7c3aed',
};

type RouteRowProps = {
    index: number;
    name: string;
    kind: RouteKind;
    tab?: string;
    isTop?: boolean;
    children?: React.ReactNode;
};

function RouteRow({index, name, kind, tab, isTop, children}: RouteRowProps) {
    const theme = useTheme();

    return (
        <View style={{flexDirection: 'row', alignItems: 'stretch', gap: 10}}>
            <View style={{alignItems: 'center', width: 28}}>
                <View
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: isTop ? theme.success : theme.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{color: 'white', fontSize: 12, fontWeight: '700'}}>{index}</Text>
                </View>
            </View>

            <View
                style={{
                    flex: 1,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isTop ? theme.success : theme.border,
                    backgroundColor: theme.highlightBG,
                    padding: 10,
                    gap: 8,
                    marginBottom: 6,
                }}
            >
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4}}>
                    <Text style={{color: theme.text, fontSize: 14, fontWeight: '700'}}>{name}</Text>
                    <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
                        <View style={{backgroundColor: KIND_COLOR[kind], borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2}}>
                            <Text style={{color: 'white', fontSize: 11, fontWeight: '600'}}>{KIND_LABEL[kind]}</Text>
                        </View>
                        {!!tab && (
                            <View style={{backgroundColor: theme.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2}}>
                                <Text style={{color: theme.textSupporting, fontSize: 11}}>{tab}</Text>
                            </View>
                        )}
                        {isTop && (
                            <View style={{backgroundColor: theme.success, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2}}>
                                <Text style={{color: 'white', fontSize: 11, fontWeight: '700'}}>na wierzchu</Text>
                            </View>
                        )}
                    </View>
                </View>
                {children}
            </View>
        </View>
    );
}

function Connector() {
    const theme = useTheme();
    return (
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 0}}>
            <View style={{width: 28, alignItems: 'center'}}>
                <View style={{width: 2, height: 10, backgroundColor: theme.border}} />
            </View>
        </View>
    );
}

function RootStateDiagram() {
    const theme = useTheme();

    return (
        <View style={{marginVertical: 12}}>
            <RouteRow
                index={0}
                name="ReportsSplitNavigator"
                kind="split"
                tab="Inbox"
            >
                <View style={{flexDirection: 'row', gap: 6}}>
                    <MiniScreen
                        label="Home"
                        sublabel="sidebar"
                        color={theme.link}
                        flex={2}
                    />
                    <MiniScreen
                        label="Report"
                        sublabel="central"
                        color={theme.success}
                        flex={3}
                    />
                </View>
            </RouteRow>

            <Connector />

            <RouteRow
                index={1}
                name="Home"
                kind="screen"
                tab="Inbox"
            />

            <Connector />

            <RouteRow
                index={2}
                name="SearchFullscreenNavigator"
                kind="fullscreen"
                tab="Search"
            >
                <View style={{gap: 4}}>
                    <MiniScreen
                        label="Search_Root"
                        sublabel="routes[0]"
                        color="#0369a1"
                        faded
                    />
                    <MiniScreen
                        label="Search_Root"
                        sublabel="routes[1]"
                        color="#0369a1"
                        faded
                    />
                    <MiniScreen
                        label="Search_Root"
                        sublabel="routes[2]  ← widoczny"
                        color="#0369a1"
                    />
                </View>
            </RouteRow>

            <Connector />

            <RouteRow
                index={3}
                name="Workspaces_List"
                kind="screen"
                tab="Workspaces"
            />

            <Connector />

            <RouteRow
                index={4}
                name="WorkspaceSplitNavigator"
                kind="split"
                tab="Workspaces"
            >
                <View style={{flexDirection: 'row', gap: 6}}>
                    <MiniScreen
                        label="Workspace Initial"
                        sublabel="sidebar"
                        color={theme.link}
                        flex={2}
                    />
                    <MiniScreen
                        label="Workspace Overview"
                        sublabel="central"
                        color={theme.success}
                        flex={3}
                    />
                </View>
            </RouteRow>

            <Connector />

            <RouteRow
                index={5}
                name="RightModalNavigator"
                kind="modal"
                isTop
            >
                {/* Nested modal stack navigator */}
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: '#7c3aed',
                        borderRadius: 8,
                        padding: 8,
                        gap: 6,
                    }}
                >
                    <Text style={{color: '#7c3aed', fontSize: 11, fontWeight: '700', marginBottom: 2}}>{'SettingsModalStackNavigator'}</Text>
                    <MiniScreen
                        label="Settings_Profile"
                        sublabel="routes[0]"
                        color="#7c3aed"
                        faded
                    />
                    <MiniScreen
                        label="Settings_Display_Name"
                        sublabel="routes[1]  ← widoczny"
                        color="#7c3aed"
                    />
                </View>
            </RouteRow>

            <Text style={{color: theme.textSupporting, fontSize: 13, marginTop: 10, marginLeft: 38}}>
                {
                    'RootStackNavigator renderuje jednocześnie maksymalnie 2 ostatnie FullScreen navigatory (dla animacji przejść). Reszta jest odmontowana, ale ich stan jest zachowany w preservedNavigatorStates.'
                }
            </Text>
        </View>
    );
}

export default RootStateDiagram;
