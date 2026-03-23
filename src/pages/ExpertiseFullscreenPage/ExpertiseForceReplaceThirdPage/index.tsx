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
import type {ExpertiseForceReplaceNavParamList} from '@libs/Navigation/types';
import type SCREENS from '@src/SCREENS';

function ExpertiseForceReplaceThirdPage() {
    const styles = useThemeStyles();
    const route = useRoute<PlatformStackRouteProp<ExpertiseForceReplaceNavParamList, typeof SCREENS.EXPERTISE_FORCE_REPLACE_NAV.THIRD>>();
    const wasReplaced = route.params.wasReplaced === 'true';

    return (
        <ScreenWrapper testID="ExpertiseForceReplaceThirdPage">
            <HeaderWithBackButton
                title="Strona C"
                onBackButtonPress={() => Navigation.goBack()}
            />
            <View style={[styles.flex1, styles.p5, {gap: 16}]}>
                <Text style={[styles.textHeadlineH2, styles.mb2]}>Strona C</Text>
                {wasReplaced ? (
                    <View style={{gap: 8}}>
                        <Text style={[styles.textSupporting, {fontSize: 16}]}>
                            Dotarłeś tu przez <Text style={styles.textBold}>forceReplace</Text>.
                        </Text>
                        <Text style={[styles.textSupporting, {fontSize: 16}]}>
                            Stos: <Text style={styles.textBold}>[A, C]</Text> — strona B została zastąpiona. Kliknij wstecz, żeby wrócić na stronę A.
                        </Text>
                    </View>
                ) : (
                    <View style={{gap: 8}}>
                        <Text style={[styles.textSupporting, {fontSize: 16}]}>
                            Dotarłeś tu przez <Text style={styles.textBold}>navigate (normalnie)</Text>.
                        </Text>
                        <Text style={[styles.textSupporting, {fontSize: 16}]}>
                            Stos: <Text style={styles.textBold}>[A, B, C]</Text> — strona B nadal jest w stosie. Kliknij wstecz, żeby wrócić na stronę B.
                        </Text>
                    </View>
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

export default ExpertiseForceReplaceThirdPage;
