import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import AnimatedSection from './AnimatedSection';

function GoBackWithParamsSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="goBack z porównywaniem parametrów">
            <Text style={[styles.mt3, styles.mb4, styles.textSupporting, {fontSize: 18}]}>
                Demo: param-page/1 → param-page/2 → param-page/3 → ostatnia strona. Na ostatniej stronie sprawdź różnicę między goBack z compareParams i bez.
            </Text>
            <View style={styles.mb3}>
                <Button
                    success
                    large
                    text="Otwórz demo"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_PARAM_PAGE.getRoute(1))}
                />
            </View>
        </AnimatedSection>
    );
}

export default GoBackWithParamsSection;
