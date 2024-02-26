import React, {useEffect, useRef} from 'react';
import type {AppStateStatus} from 'react-native';
import {AppState, View} from 'react-native';
import Text from '@components/Text';
import ShareExtensionHandlerModule from '@src/modules/ShareExtensionHandlerModule';

// type ShareRootPageProps = {};

export default function ShareRootPage() {
    const appState = useRef(AppState.currentState);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            ShareExtensionHandlerModule.processFiles((processedFiles) => {
                // eslint-disable-next-line no-console
                console.log('PROCESSED FILES ', processedFiles);
            });
        }

        appState.current = nextAppState;
        // eslint-disable-next-line no-console
        console.log('AppState', appState.current);
    };

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            appStateSubscription.remove();
        };
    }, []);

    return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <Text>share root</Text>
        </View>
    );
}
