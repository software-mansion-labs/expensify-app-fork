import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

function ExpertiseForceReplaceSecondPage() {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper testID="ExpertiseForceReplaceSecondPage">
            <HeaderWithBackButton
                title="Strona B"
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Strona B — stos: [A, B]</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>Wybierz, jak chcesz przejść do strony C:</Text>
                <View style={{gap: 8}}>
                    <Text style={[styles.textSupporting, {fontSize: 13}]}>
                        ➕ <Text style={styles.textBold}>Normalnie (navigate)</Text> — B zostaje w stosie. Stos po przejściu: [A, B, C]. Wstecz z C → B.
                    </Text>
                    <Button
                        success
                        large
                        text="Przejdź do C (navigate)"
                        onPress={() => Navigation.navigate(ROUTES.EXPERTISE_FORCE_REPLACE_THIRD.getRoute(false))}
                    />
                </View>
                <View style={{gap: 8}}>
                    <Text style={[styles.textSupporting, {fontSize: 13}]}>
                        🔄 <Text style={styles.textBold}>Z forceReplace</Text> — B zostaje zastąpiona przez C. Stos po przejściu: [A, C]. Wstecz z C → A.
                    </Text>
                    <Button
                        large
                        text="Przejdź do C (forceReplace)"
                        onPress={() => Navigation.navigate(ROUTES.EXPERTISE_FORCE_REPLACE_THIRD.getRoute(true), {forceReplace: true})}
                    />
                </View>
                <Button
                    large
                    text="Zamknij modal"
                    onPress={() => Navigation.dismissModal()}
                />
            </View>
        </ScreenWrapper>
    );
}

export default ExpertiseForceReplaceSecondPage;
