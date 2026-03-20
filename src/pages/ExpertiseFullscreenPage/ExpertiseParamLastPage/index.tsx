import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

function ExpertiseParamLastPage() {
    const styles = useThemeStyles();

    return (
        <ScreenWrapper testID="ExpertiseParamLastPage">
            <HeaderWithBackButton
                title="Ostatnia strona (bez parametrów)"
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Ostatnia strona</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>
                    Ta strona nie ma parametrów. W stosie mamy: param-page/1, param-page/2, param-page/3, ta strona. Dwa przyciski poniżej pokazują różnicę między{' '}
                    <Text style={styles.textBold}>compareParams: true</Text> i <Text style={styles.textBold}>compareParams: false</Text>.
                </Text>
                <View style={{gap: 8}}>
                    <Text style={[styles.textSupporting, {fontSize: 13}]}>
                        ✅ <Text style={styles.textBold}>Z porównaniem parametrów</Text> — szuka dokładnie param-page/1 w stosie i do niego skacze.
                    </Text>
                    <Button
                        success
                        large
                        text="goBack do param-page/1 (compareParams: true)"
                        onPress={() => Navigation.goBack(ROUTES.EXPERTISE_PARAM_PAGE.getRoute(1), {compareParams: true})}
                    />
                </View>
                <View style={{gap: 8}}>
                    <Text style={[styles.textSupporting, {fontSize: 13}]}>
                        🔄 <Text style={styles.textBold}>Bez porównania parametrów</Text> — znajduje dowolne param-page w stosie (param-page/1) i zastępuje jego parametry wartością 4. Efekt:
                        param-page/4.
                    </Text>
                    <Button
                        large
                        text="goBack do param-page/4 (compareParams: false)"
                        onPress={() => Navigation.goBack(ROUTES.EXPERTISE_PARAM_PAGE.getRoute(4), {compareParams: false})}
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

export default ExpertiseParamLastPage;
