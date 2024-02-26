import React, {useEffect} from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import ShareExtensionHandlerModule from '@src/modules/ShareExtensionHandlerModule';

// type ShareRootPageProps = {};

export default function ShareRootPage() {
    useEffect(() => {
        ShareExtensionHandlerModule?.processFiles((processedFiles) => {
            // eslint-disable-next-line no-console
            console.warn('PROCESSED FILES ', processedFiles);
        });
    }, []);

    return (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <Text>share root</Text>
        </View>
    );
}
