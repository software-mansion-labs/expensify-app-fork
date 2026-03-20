import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import SplitNavigatorDiagram from './SplitNavigatorDiagram';
import Tip from './Tip';
import type {TipProps} from './Tip';

const SPLIT_NAVIGATOR_POINTS: TipProps[] = [
    {
        number: 1,
        heading: 'Dwa ekrany jednocześnie',
        body: 'SplitNavigator wyświetla dwie strony obok siebie — na szerokim ekranie (tablet, desktop) lewa kolumna pokazuje listę, a prawa kolumna wyświetla szczegóły wybranego elementu.',
    },
    {
        number: 2,
        heading: 'Responsywność',
        body: 'Na wąskich ekranach (telefon) SplitNavigator zachowuje się jak zwykły stos — pokazuje tylko jeden ekran na raz, dzięki czemu ten sam kod działa poprawnie na wszystkich urządzeniach.',
    },
    {
        number: 3,
        heading: 'Lepsza wydajność na szerokich ekranach',
        body: 'Zamiast przeładowywać cały widok przy każdej nawigacji, SplitNavigator utrzymuje lewy panel w pamięci i podmienia tylko prawą stronę, co znacząco przyspiesza interakcję.',
    },
    {
        number: 4,
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
                <Tip
                    key={point.number}
                    {...point}
                />
            ))}
            <Text style={[styles.mt4, styles.textSupporting, {fontSize: 16}]}>
                {'Kluczową częścią SplitRoutera jest funkcja '}
                <Text style={[styles.textSupporting, {fontSize: 16, fontWeight: 'bold'}]}>adaptStateIfNecessary</Text>
                {
                    ' (src/libs/Navigation/AppNavigator/createSplitNavigator/SplitRouter.ts), która upewnia się, że stan nawigatora zawsze zawiera odpowiednie ekrany dla aktualnego układu — np. dodaje sidebar przy otwarciu przez deep link lub uzupełnia ekran centralny na szerokim ekranie.'
                }
            </Text>
        </AnimatedSection>
    );
}

export default SplitNavigatorExplanationSection;
