import React from 'react';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';
import RootStateDiagram from './RootStateDiagram';

function RootStateSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Jak wygląda stan całej aplikacji?">
            <Text style={[styles.mt3, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                Cała nawigacja w aplikacji to jeden wielki stos — RootStackNavigator. W środku znajdują się SplitNavigatory, FullscreenNavigatory oraz zwykłe ekrany i modale. Poniżej
                przykładowy stan po przejściu przez kilka zakładek i otwarciu RHP.
            </Text>
            <RootStateDiagram />
        </AnimatedSection>
    );
}

export default RootStateSection;
