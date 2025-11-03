import React, {useCallback, useContext, useState} from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import SplashScreenHider from './components/SplashScreenHider';
import Text from './components/Text';
import SplashScreenStateContext, {SplashScreenStateContextProvider} from './SplashScreenStateContext';
import CONST from './CONST';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

function Expensify() {
    const [isNavigationReady] = useState(true); // Simplified - always ready
    const [hasAttemptedToOpenPublicRoom] = useState(true); // Simplified - always ready
    const {splashScreenState, setSplashScreenState} = useContext(SplashScreenStateContext);

    const isSplashVisible = splashScreenState === CONST.BOOT_SPLASH_STATE.VISIBLE;
    const shouldInit = isNavigationReady && hasAttemptedToOpenPublicRoom;
    const shouldHideSplash = shouldInit && isSplashVisible;

    const onSplashHide = useCallback(() => {
        setSplashScreenState(CONST.BOOT_SPLASH_STATE.HIDDEN);
    }, [setSplashScreenState]);

    return (
        <>
            <SafeAreaView style={styles.container}>
                <View>
                    <Text style={styles.text}>WebAuthn Test App</Text>
                    <Text>Ready for WebAuthn implementation</Text>
                    <Text>Splash state: {splashScreenState}</Text>
                </View>
            </SafeAreaView>
            {shouldHideSplash && <SplashScreenHider onHide={onSplashHide} />}
        </>
    );
}

function App() {
    return (
        <SplashScreenStateContextProvider>
            <Expensify />
        </SplashScreenStateContextProvider>
    );
}

export default App;
