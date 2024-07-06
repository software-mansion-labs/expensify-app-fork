import React, {useState} from 'react';
import {Platform, View} from 'react-native';
import PushProvisioning from 'react-native-wallet';
import Button from '@components/Button';
import Text from '@components/Text';
import Log from '@libs/Log';

function TestNativeWalletComponent() {
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleIosTest = () => {
        setIsLoading(true);
        PushProvisioning.Apple.canAddPass()
            .then((canAdd) => {
                setResult(`Can add pass: ${canAdd}`);
                setError(null);
            })
            .catch((e: unknown) => {
                const errorMessage = e instanceof Error ? e.message : String(e);
                Log.hmmm(`[PushProvisioning] Apple.canAddPass error: ${errorMessage}`);
                setResult(null);
                setError('Error on Apple.canAddPass');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleAndroidTest = () => {
        setIsLoading(true);
        PushProvisioning.Google.getStableHardwareId()
            .then((hardwareId: string) => {
                setResult(`Stable hardware ID: ${hardwareId}`);
                setError(null);
            })
            .catch((e: unknown) => {
                const errorMessage = e instanceof Error ? e.message : String(e);
                Log.hmmm(`[PushProvisioning] Google.getStableHardwareId error: ${errorMessage}`);
                setResult(null);
                setError('Error on Google.getStableHardwareId');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <View style={{padding: 20}}>
            {Platform.OS === 'ios' && (
                <>
                    <Button
                        text="Test canAddPass (iOS)"
                        isLoading={isLoading}
                        onPress={handleIosTest}
                    />
                    {result && <Text>{result}</Text>}
                    {error && <Text style={{color: 'red'}}>{error}</Text>}
                </>
            )}
            {Platform.OS === 'android' && (
                <>
                    <Button
                        isLoading={isLoading}
                        text="Test getStableHardwareId (Android)"
                        onPress={handleAndroidTest}
                    />
                    {result && <Text>{result}</Text>}
                    {error && <Text style={{color: 'red'}}>{error}</Text>}
                </>
            )}
            {Platform.OS !== 'android' && Platform.OS !== 'ios' && <Text style={{color: 'red'}}>You need an iOS or Android</Text>}
        </View>
    );
}

export default TestNativeWalletComponent;
