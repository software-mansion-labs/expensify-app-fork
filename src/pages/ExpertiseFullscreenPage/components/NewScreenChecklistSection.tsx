import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import Tip from './Tip';
import type {TipProps} from './Tip';

const CHECKLIST_POINTS: TipProps[] = [
    {
        number: 1,
        heading: 'Odświeżenie strony',
        body: 'Otwórz nowy ekran bezpośrednio przez URL i odśwież przeglądarkę (lub zabij i wznów aplikację). React Navigation odtwarza drzewo nawigacji wyłącznie z adresu URL — sprawdź, że getAdaptedStateFromPath poprawnie rekonstruuje stan i nie trafiasz na biały ekran ani błąd.',
    },
    {
        number: 2,
        heading: 'Gest cofnięcia (iOS) i przycisk Wstecz (Android)',
        body: 'Na iOS upewnij się, że swipe back edge gesture cofa do właściwego ekranu. Na Androidzie sprawdź systemowy przycisk Wstecz — oba powinny poruszać się po stosie przewidywalnie i nie wyrzucać użytkownika z aplikacji w nieoczekiwanym momencie.',
    },
    {
        number: 3,
        heading: 'Przycisk Wstecz przeglądarki (desktop / web)',
        body: 'Na wersji webowej kliknij Wstecz i Dalej w przeglądarce. Historia URL powinna się zmieniać spójnie z nawigacją w aplikacji — żaden krok nie powinien być pominięty ani zdublowany.',
    },
    {
        number: 4,
        heading: 'Właściwy ekran pełnoekranowy pod RHP',
        body: 'Jeśli nowy ekran jest ekranem RHP, sprawdź co pojawia się w tle po bezpośrednim otwarciu jego adresu URL. Odpowiedź zależy od tablic RELATIONS — jeśli ekran nie jest jeszcze w żadnej tablicy, tło będzie puste lub błędne. Dopisz go do odpowiedniej tablicy forward w src/libs/Navigation/linkingConfig/RELATIONS/, a mapowanie inverse zostanie wygenerowane automatycznie.',
    },
    {
        number: 5,
        heading: 'Typy nawigacji',
        body: 'Sprawdź, że nowy ekran ma poprawne typy w definicji nawigatora (parametry trasy, typy props). Brakujące lub niepoprawne typy są wykrywane przez TypeScript — uruchom npm run typecheck-tsgo, żeby upewnić się, że nie ma błędów typów powiązanych z nową trasą.',
    },
];

function NewScreenChecklistSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Co sprawdzić po dodaniu nowej strony">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                {'Dodanie nowego ekranu to nie tylko rejestracja trasy. Sprawdź poniższe punkty, zanim uznasz pracę za skończoną.'}
            </Text>
            {CHECKLIST_POINTS.map((point) => (
                <Tip
                    key={point.number}
                    {...point}
                />
            ))}
        </AnimatedSection>
    );
}

export default NewScreenChecklistSection;
