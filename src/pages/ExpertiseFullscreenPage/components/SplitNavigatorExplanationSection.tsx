import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import SplitNavigatorDiagram from './SplitNavigatorDiagram';

function SplitNavigatorExplanationSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Po co nam SplitNavigatory?">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                SplitNavigator to nasza własna implementacja nawigatora, zbudowana na bazie prymitywów React Navigation. Zaimplementowaliśmy ten typ nawigatora, żeby wyświetlać dwie strony
                jednocześnie na szerokim ekranie — np. listę raportów po lewej i widok raportu po prawej, ale na wąskim ekranie pozostawić zwykły stos.
            </Text>
            <SplitNavigatorDiagram />
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
