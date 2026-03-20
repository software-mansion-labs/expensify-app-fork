import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import Tip from './Tip';
import type {TipProps} from './Tip';

const DEBUGGING_TIPS: TipProps[] = [
    {
        number: 1,
        heading: 'console.log stanu w handleStateChange',
        body: 'Najszybszy sposób na podgląd aktualnego stanu nawigacji to dopisanie console.log(state) w funkcji handleStateChange w NavigationRoot.tsx. Ta funkcja wywoływana jest przy każdej zmianie stanu — dzięki niej widać pełne drzewo nawigacji po każdej akcji.',
        code: `// src/libs/Navigation/NavigationRoot.tsx
const handleStateChange = (state: NavigationState | undefined) => {
    if (!state) {
        return;
    }
    console.log(state); // ← dodaj tutaj
    // ...
};`,
    },
    {
        number: 2,
        heading: 'Breakpoint w funkcjach nawigacji',
        body: 'Żeby dowiedzieć się, skąd pochodzi konkretna akcja nawigacyjna, warto ustawić breakpoint wewnątrz funkcji navigate, goBack lub linkTo. Debugger pokaże pełny call stack — zobaczysz dokładnie, który komponent lub akcja Onyx wywołała nawigację.',
        code: `// src/libs/Navigation/Navigation.ts
function navigate(route: Route, type?: string) {
    debugger; // ← wywołaj DevTools i sprawdź call stack
    // ...
}`,
    },
    {
        number: 3,
        heading: 'React DevTools — zakładka "Components" w przeglądarce',
        body: 'Zakładka "Components" pojawia się dopiero po zainstalowaniu rozszerzenia React Developer Tools (dostępne dla Chrome i Firefox w ich sklepach z rozszerzeniami). Po instalacji i odświeżeniu strony zakładka jest widoczna obok "Console" i "Network". Tam można wyszukać NavigationContainer i podejrzeć cały props.state — ten sam obiekt, który ląduje w handleStateChange.',
    },
];

function DebuggingNavigationSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Debugowanie nawigacji">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                Nawigacja bywa trudna do śledzenia — akcje mogą pochodzić z wielu miejsc, a stan zmienia się przy każdym kroku. Oto sprawdzone sposoby na szybkie ustalenie co, gdzie i
                dlaczego się dzieje.
            </Text>
            {DEBUGGING_TIPS.map((tip) => (
                <Tip
                    key={tip.number}
                    {...tip}
                />
            ))}
        </AnimatedSection>
    );
}

export default DebuggingNavigationSection;
