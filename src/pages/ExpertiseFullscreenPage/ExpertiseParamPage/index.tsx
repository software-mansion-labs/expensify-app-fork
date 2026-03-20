import {useRoute} from '@react-navigation/native';
import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackRouteProp} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ExpertiseParamNavParamList} from '@libs/Navigation/types';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

const NEXT_PARAM: Record<number, number> = {1: 2, 2: 3};

function ExpertiseParamPage() {
    const styles = useThemeStyles();
    const route = useRoute<PlatformStackRouteProp<ExpertiseParamNavParamList, typeof SCREENS.EXPERTISE_PARAM_NAV.PARAM>>();
    const numberParam = Number(route.params.numberParam);
    const nextParam = NEXT_PARAM[numberParam];

    return (
        <ScreenWrapper testID="ExpertiseParamPage">
            <HeaderWithBackButton
                title={`Strona z parametrem`}
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>param-page/{numberParam}</Text>
                <Text style={[styles.textSupporting, {fontSize: 16}]}>
                    To jest strona z parametrem <Text style={styles.textBold}>{numberParam}</Text>. Stos: param-page/1 → param-page/2 → param-page/3 → ostatnia strona (bez parametrów).
                </Text>
                {nextParam ? (
                    <Button
                        success
                        large
                        text={`Przejdź do param-page/${nextParam} →`}
                        onPress={() => Navigation.navigate(ROUTES.EXPERTISE_PARAM_PAGE.getRoute(nextParam))}
                    />
                ) : (
                    <Button
                        success
                        large
                        text="Przejdź do ostatniej strony (bez param) →"
                        onPress={() => Navigation.navigate(ROUTES.EXPERTISE_PARAM_LAST_PAGE)}
                    />
                )}
                <Button
                    large
                    text="← Wróć"
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

export default ExpertiseParamPage;
