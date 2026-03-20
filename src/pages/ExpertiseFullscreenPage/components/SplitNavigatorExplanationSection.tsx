import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import SplitNavigatorDiagram from './SplitNavigatorDiagram';

const SPLIT_NAVIGATOR_POINTS = [
    {
        heading: 'Dwa ekrany jednocześnie',
        body: 'SplitNavigator wyświetla dwie strony obok siebie — na szerokim ekranie (tablet, desktop) lewa kolumna pokazuje listę, a prawa kolumna wyświetla szczegóły wybranego elementu.',
    },
    {
        heading: 'Responsywność',
        body: 'Na wąskich ekranach (telefon) SplitNavigator zachowuje się jak zwykły stos — pokazuje tylko jeden ekran na raz, dzięki czemu ten sam kod działa poprawnie na wszystkich urządzeniach.',
    },
    {
        heading: 'Lepsza wydajność na szerokich ekranach',
        body: 'Zamiast przeładowywać cały widok przy każdej nawigacji, SplitNavigator utrzymuje lewy panel w pamięci i podmienia tylko prawą stronę, co znacząco przyspiesza interakcję.',
    },
    {
        heading: 'Spójne URL-e i deep linking',
        body: 'Każda kombinacja lewy-prawy panel ma swój unikalny adres URL, co umożliwia udostępnianie linków oraz odtworzenie dokładnego stanu aplikacji po odświeżeniu strony.',
    },
];

function SplitNavigatorExplanationSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Po co nam SplitNavigatory?">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                SplitNavigator to nasza własna implementacja nawigatora, zbudowana na bazie prymitywów React Navigation. React Navigation nie oferuje takiego nawigatora z pudełka —
                stworzyliśmy go sami, żeby wyświetlać dwie strony jednocześnie — np. listę raportów po lewej i szczegóły raportu po prawej.
            </Text>
            <SplitNavigatorDiagram />
            {SPLIT_NAVIGATOR_POINTS.map((point) => (
                <View
                    key={point.heading}
                    style={[styles.pv3, styles.flexRow, {gap: 10}]}
                >
                    <Text style={[styles.textStrong, {fontSize: 20, lineHeight: 28}]}>{'\u2022'}</Text>
                    <View style={styles.flex1}>
                        <Text style={[styles.textStrong, styles.mb1, {fontSize: 20}]}>{point.heading}</Text>
                        <Text style={[styles.textSupporting, {fontSize: 18}]}>{point.body}</Text>
                    </View>
                </View>
            ))}
        </AnimatedSection>
    );
}

export default SplitNavigatorExplanationSection;
