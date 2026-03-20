import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';

function ExpertiseNavThirdPage() {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper testID="ExpertiseNavThirdPage">
            <HeaderWithBackButton
                title="Trzecia strona"
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Strona 3 / 3</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>Ostatnia strona stosu. Strzałka wstecz cofa do strony 2. Zamknięcie modala wraca bezpośrednio do ekranu w tle.</Text>
                <Button
                    large
                    text="Wróć do strony 2"
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

export default ExpertiseNavThirdPage;
