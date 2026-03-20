import React from 'react';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';

const COLORS = {
    input: '#1e40af',
    context: '#1d4ed8',
    decision: '#b45309',
    action: '#166534',
    resultModified: '#166534',
    resultUnchanged: '#374151',
    arrow: '#6b7280',
    branchLabel: '#374151',
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

type DecisionNodeProps = {
    question: string;
    yesAction: ReactNode;
    noLabel?: string;
};

function DecisionNode({question, yesAction, noLabel = 'NIE — kontynuuj'}: DecisionNodeProps) {
    const theme = useTheme();

    return (
        <View>
            <FlowBox color={COLORS.decision}>
                <FlowText bold>{'? ' + question}</FlowText>
            </FlowBox>
            <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
                <View style={{flex: 5, gap: 4}}>
                    <Text style={{color: '#16a34a', fontSize: 13, fontWeight: '700', textAlign: 'center'}}>TAK ↓</Text>
                    <FlowBox color={COLORS.action}>{yesAction}</FlowBox>
                </View>
                <View style={{flex: 3, justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{color: theme.textSupporting, fontSize: 13, textAlign: 'center'}}>{noLabel + ' →'}</Text>
                </View>
            </View>
        </View>
    );
}

function AdaptStateDiagram() {
    const theme = useTheme();

    return (
        <View style={{gap: 2, marginVertical: 12}}>
            {/* Input */}
            <FlowBox color={COLORS.input}>
                <FlowText bold>Aplikacja się otwiera lub zmienia się szerokość ekranu</FlowText>
            </FlowBox>

            <Arrow />

            {/* Context */}
            <FlowBox color={COLORS.context}>
                <FlowText bold>Sprawdź układ ekranu</FlowText>
                <FlowText
                    small
                    dim
                >
                    {'Czy ekran jest wąski (telefon) czy szeroki (tablet/desktop)?\nCzy to pierwsze uruchomienie aplikacji?'}
                </FlowText>
            </FlowBox>

            <Arrow />

            {/* Decision 1 */}
            <DecisionNode
                question={'Brakuje sidebara w nawigatorze?'}
                yesAction={
                    <>
                        <FlowText bold>Dodaj sidebar na początek stosu</FlowText>
                        <FlowText
                            small
                            dim
                        >
                            {'Sidebar musi być zawsze dostępny —\nżeby użytkownik mógł cofnąć się gestem\nlub żeby wypełnić lewą kolumnę'}
                        </FlowText>
                    </>
                }
            />

            <Arrow />

            {/* Decision 2 */}
            <DecisionNode
                question={'Szeroki ekran, ale widoczny jest tylko sidebar?'}
                yesAction={
                    <>
                        <FlowText bold>Dodaj ekran po prawej stronie</FlowText>
                        <FlowText
                            small
                            dim
                        >
                            {'Prawa kolumna nie może być pusta.\nPrzywróć ostatnio odwiedzony ekran\nlub pokaż domyślny'}
                        </FlowText>
                    </>
                }
            />

            <Arrow />

            {/* Final decision */}
            <FlowBox color={COLORS.decision}>
                <FlowText bold>Czy cokolwiek zostało zmienione?</FlowText>
            </FlowBox>

            <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
                <View style={{flex: 1, gap: 4}}>
                    <Text style={{color: '#16a34a', fontSize: 13, fontWeight: '700', textAlign: 'center'}}>TAK ↓</Text>
                    <FlowBox color={COLORS.resultModified}>
                        <FlowText bold>Zwróć poprawiony stan</FlowText>
                        <FlowText
                            small
                            dim
                        >
                            {'React Navigation uzupełnia\nbrakujące dane i uruchamia\nnawigator z właściwymi ekranami'}
                        </FlowText>
                    </FlowBox>
                </View>
                <View style={{flex: 1, gap: 4}}>
                    <Text style={{color: theme.textSupporting, fontSize: 13, fontWeight: '700', textAlign: 'center'}}>NIE ↓</Text>
                    <FlowBox color={COLORS.resultUnchanged}>
                        <FlowText bold>Nic nie rób</FlowText>
                        <FlowText
                            small
                            dim
                        >
                            {'Stan był już poprawny —\nzwróć go bez zmian'}
                        </FlowText>
                    </FlowBox>
                </View>
            </View>
        </View>
    );
}

export default AdaptStateDiagram;
