import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import AnimatedSection from './AnimatedSection';

function ForceReplaceSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="navigate z forceReplace">
            <Text style={[styles.mt3, styles.mb4, styles.textSupporting, {fontSize: 18}]}>
                Demo: A → B → C (normalnie lub z forceReplace). Sprawdź jak forceReplace usuwa B ze stosu — wstecz z C prowadzi do A zamiast do B.
            </Text>
            <View style={styles.mb3}>
                <Button
                    success
                    large
                    text="Otwórz demo"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_FORCE_REPLACE_FIRST)}
                />
            </View>
        </AnimatedSection>
    );
}

export default ForceReplaceSection;
