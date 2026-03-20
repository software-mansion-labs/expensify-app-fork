import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

function ExpertiseNavFirstPage() {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper testID="ExpertiseNavFirstPage">
            <HeaderWithBackButton
                title="Pierwsza strona"
                onBackButtonPress={() => Navigation.dismissModal()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Strona 1 / 3</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>To jest pierwsza strona stosu nawigacyjnego. Możesz przejść do następnej strony lub zamknąć cały modal.</Text>
                <Button
                    success
                    large
                    text="Przejdź do strony 2 →"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_NAV_SECOND)}
                />
                <Button
                    large
                    text="Zamknij modal"
                    onPress={() => Navigation.dismissModal()}
                />
            </View>
        </ScreenWrapper>
    );
}

export default ExpertiseNavFirstPage;
