import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import AnimatedSection from './AnimatedSection';

function NavigationFunctionsSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Najważniejsze funkcje nawigacji">
            <Text style={[styles.mt3, styles.mb4, styles.textSupporting, {fontSize: 18}]}>
                Otwórz trójstronicowy stos w RHP, żeby zobaczyć w praktyce jak działają navigate, goBack i dismissModal.
            </Text>
            <View style={styles.mb3}>
                <Button
                    success
                    large
                    text="Otwórz demo nawigacji →"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_NAV_FIRST)}
                />
            </View>
            <Text style={[styles.mt2, styles.mb2, styles.textSupporting, {fontSize: 18}]}>
                Demo 2: param-page/1 → param-page/2 → param-page/3 → ostatnia strona. Na ostatniej stronie sprawdź różnicę między goBack z compareParams i bez.
            </Text>
            <View style={styles.mb3}>
                <Button
                    success
                    large
                    text="Otwórz demo parametrów →"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_PARAM_PAGE.getRoute(1))}
                />
            </View>
        </AnimatedSection>
    );
}

export default NavigationFunctionsSection;
