import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

function ExpertiseNavSecondPage() {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper testID="ExpertiseNavSecondPage">
            <HeaderWithBackButton
                title="Druga strona"
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Strona 2 / 3</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>
                    To jest druga strona stosu. Strzałka wstecz w nagłówku cofa do strony 1. Możesz też przejść do strony 3 lub zamknąć cały modal.
                </Text>
                <Button
                    success
                    large
                    text="Przejdź do strony 3 →"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_NAV_THIRD)}
                />
                <Button
                    large
                    text="Wróć do strony 1"
                    onPress={() => Navigation.goBack()}
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

export default ExpertiseNavSecondPage;
