import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import AnimatedSection from './AnimatedSection';

function GoBackVsDismissModalSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="goBack vs dismissModal">
            <Text style={[styles.mt3, styles.mb4, styles.textSupporting, {fontSize: 18}]}>
                Otwórz trójstronicowy stos w RHP, żeby zobaczyć w praktyce jak działają navigate, goBack i dismissModal.
            </Text>
            <View style={styles.mb3}>
                <Button
                    success
                    large
                    text="Otwórz demo"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_NAV_FIRST)}
                />
            </View>
        </AnimatedSection>
    );
}

export default GoBackVsDismissModalSection;
