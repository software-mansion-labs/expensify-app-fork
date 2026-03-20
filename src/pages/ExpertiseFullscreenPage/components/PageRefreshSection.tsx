import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import RelationsDiagram from './RelationsDiagram';
import Tip from './Tip';
import type {TipProps} from './Tip';

const RELATIONS_POINTS: TipProps[] = [
    {
        number: 1,
        heading: 'Skąd problem?',
        body: 'Ekrany RHP (Right Hand Pane) to nakładki — zawsze wyświetlają się nad jakimś ekranem pełnoekranowym. Adres URL koduje tylko sam ekran RHP, np. /settings/profile/display-name. React Navigation, parsując ten URL, nie wie, który navigator powinien być w tle.',
    },
    {
        number: 2,
        heading: 'Czym są RELATIONS?',
        body: 'RELATIONS to słowniki w katalogu src/libs/Navigation/linkingConfig/RELATIONS/. Każdy plik opisuje jeden rodzaj zależności — np. SETTINGS_TO_RHP mówi: „ekran PROFILE.ROOT jest właścicielem tych ekranów RHP". Dzięki temu wiadomo, co pokazać w tle.',
    },
    {
        number: 3,
        heading: 'Kierunek forward i inverse',
        body: 'Pliki RELATIONS definiują mapowanie w kierunku forward (central screen → lista ekranów RHP). Funkcja createInverseRelation w RELATIONS/index.ts automatycznie odwraca te mapowania, tworząc słowniki inverse (RHP → central screen). Nie trzeba ich utrzymywać ręcznie.',
    },
    {
        number: 4,
        heading: 'getMatchingFullScreenRoute',
        body: 'To właśnie ta funkcja odpytuje tablice inverse. Sprawdza kolejno: RHP_TO_SEARCH, RHP_TO_SIDEBAR, RHP_TO_HOME, RHP_TO_EXPERTISE, RHP_TO_WORKSPACES_LIST, RHP_TO_WORKSPACE, RHP_TO_SETTINGS, RHP_TO_DOMAIN. Gdy znajdzie dopasowanie, buduje odpowiednią strukturę stanu nawigatora.',
    },
    {
        number: 5,
        heading: 'Co zrobić, dodając nowy ekran RHP?',
        body: 'Wystarczy dopisać nowy ekran do odpowiedniej tablicy forward w katalogu RELATIONS/. Inverse zostanie wygenerowane automatycznie. Jeśli nowy ekran nie pasuje do żadnej istniejącej kategorii, trzeba stworzyć nowy plik RELATIONS i obsłużyć go w getMatchingFullScreenRoute.',
    },
];

function PageRefreshSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Odświeżanie strony">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                Po odświeżeniu strony React Navigation nie ma zapisanego drzewa nawigacji — jedynym źródłem prawdy jest adres URL. Aplikacja musi odtworzyć kompletny stan nawigacji od zera.
                Kluczową rolę odgrywa tutaj funkcja <Text style={[styles.textStrong, {fontSize: 18}]}>getAdaptedStateFromPath</Text>
                {' i tablice '}
                <Text style={[styles.textStrong, {fontSize: 18}]}>RELATIONS</Text>.
            </Text>
            <RelationsDiagram />
            {RELATIONS_POINTS.map((point) => (
                <Tip
                    key={point.number}
                    {...point}
                />
            ))}
        </AnimatedSection>
    );
}

export default PageRefreshSection;
