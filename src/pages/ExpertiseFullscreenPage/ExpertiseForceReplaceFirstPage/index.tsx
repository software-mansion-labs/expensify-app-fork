import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

function ExpertiseForceReplaceFirstPage() {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper testID="ExpertiseForceReplaceFirstPage">
            <HeaderWithBackButton
                title="Strona A"
                onBackButtonPress={() => Navigation.dismissModal()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Strona A — stos: [A]</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>
                    To jest strona A. Przejdź do strony B, żeby zobaczyć efekt <Text style={styles.textBold}>forceReplace</Text>.
                </Text>
                <Text style={[styles.textSupporting, {fontSize: 14}]}>
                    Na stronie B będziesz mieć dwa przyciski przejścia do C — jeden normalny i jeden z forceReplace. Wróć tutaj po obu, żeby zobaczyć różnicę w zachowaniu klawisza wstecz.
                </Text>
                <Button
                    success
                    large
                    text="Przejdź do strony B →"
                    onPress={() => Navigation.navigate(ROUTES.EXPERTISE_FORCE_REPLACE_SECOND)}
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

export default ExpertiseForceReplaceFirstPage;
