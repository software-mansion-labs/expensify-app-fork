import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AdaptStateDiagram from './AdaptStateDiagram';
import AnimatedSection from './AnimatedSection';

const ADAPTATION_STEPS = [
    {
        heading: 'Kiedy jest wywoływana?',
        body: 'Funkcja jest wywoływana w dwóch miejscach wewnątrz SplitRouter: w getInitialState (przy starcie aplikacji) oraz w getRehydratedState (przy przebudowaniu stanu np. po odświeżeniu strony lub zmianie szerokości ekranu). Za każdym razem otrzymuje aktualny stan nawigatora i opcje konfiguracyjne.',
    },
    {
        heading: 'Problem 1 — brak sidebara w stanie',
        body: 'Jeśli użytkownik otwiera aplikację bezpośrednio na ekranie centralnym (np. przez deep link), sidebar nie jest jeszcze w stosie. Na szerokim ekranie obydwa panele muszą być widoczne jednocześnie, a na wąskim ekranie potrzebujemy sidebara, żeby umożliwić gest powrotu. Funkcja dodaje wtedy ekran sidebara na początku tablicy routes (unshift), kopiując z trasy centralnej tylko te parametry, które sidebar faktycznie potrzebuje (np. policyID dla workspace).',
    },
    {
        heading: 'Problem 2 — brak ekranu centralnego na szerokim ekranie',
        body: 'Jeśli w stanie jest tylko sidebar (np. po wejściu na stronę listy ustawień na szerokim ekranie), prawa kolumna pozostałaby pusta. Funkcja dodaje wtedy defaultCentralScreen, a jeśli wcześniej był już wybrany jakiś ekran centralny w tym samym navigatorze, przywraca go z preservedNavigatorStates zamiast pokazywać domyślny.',
    },
    {
        heading: 'Flaga stale i rehydracja',
        body: 'Gdy funkcja modyfikuje stan, oznacza go flagą stale: true. To sygnał dla React Navigation, że stan jest niekompletny i wymaga rehydracji — czyli uzupełnienia brakujących kluczy dla nowych tras. Bez tego nawigator nie wiedziałby, jak zidentyfikować dodane ekrany.',
    },
    {
        heading: 'Brak modyfikacji = brak kosztów',
        body: 'Jeśli żadna z dwóch adaptacji nie była potrzebna, funkcja zwraca oryginalny obiekt stanu bez żadnych zmian, dzięki czemu nie wywołuje zbędnych rerenderów.',
    },
];

function StateAdaptationExplanationSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Po co nam adaptStateIfNecessary?">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                {
                    'adaptStateIfNecessary to funkcja wewnątrz naszego własnego SplitRouter (src/libs/Navigation/AppNavigator/createSplitNavigator/SplitRouter.ts). Jej zadanie jest proste: upewnić się, że stan SplitNavigatora zawsze ma odpowiednie ekrany dla aktualnego układu ekranu — nawet jeśli aplikacja została otwarta przez deep link lub ekran zmienił szerokość.'
                }
            </Text>
            <AdaptStateDiagram />
            {ADAPTATION_STEPS.map((step) => (
                <View
                    key={step.heading}
                    style={[styles.pv3, styles.borderBottom]}
                >
                    <Text style={[styles.textStrong, styles.mb1, {fontSize: 20}]}>{step.heading}</Text>
                    <Text style={[styles.textSupporting, {fontSize: 18}]}>{step.body}</Text>
                </View>
            ))}
        </AnimatedSection>
    );
}

export default StateAdaptationExplanationSection;
