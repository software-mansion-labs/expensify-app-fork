import React from 'react';
import ActivityIndicator from '@components/ActivityIndicator';
import {View} from 'react-native';
import {WithSkiaWeb} from '@shopify/react-native-skia/lib/module/web';

function ChartKit() {
    return (
        <WithSkiaWeb
            opts={{locateFile: (file: string) => `/${file}`}}
            getComponent={() => import('./ChartContent')}
            fallback={
                <View style={{height: 200, width: 300, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8}}>
                    <ActivityIndicator size="large" />
                </View>
            }
        />
    );
}

export default ChartKit;
