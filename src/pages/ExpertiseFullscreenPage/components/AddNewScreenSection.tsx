import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';

function AddNewScreenSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Dodajmy nowy ekran!">
            <Text style={[styles.mt3, styles.mb4, styles.textSupporting, {fontSize: 18}]}>
                Czas na live coding! Dodamy nowy ekran do aplikacji krok po kroku — od stałej w SCREENS.ts aż po wyrenderowany komponent.
            </Text>
            <View style={styles.mb3}>
                <Button
                    success
                    large
                    text="Otwórz nowy ekran"
                    onPress={() => {
                        // TODO: Navigation.navigate(ROUTES.EXPERTISE_DEMO_SCREEN)
                    }}
                />
            </View>
        </AnimatedSection>
    );
}

export default AddNewScreenSection;
