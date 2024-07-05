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

    const handleIosTest = async () => {
        setIsLoading(true);
        try {
            const canAdd = await PushProvisioning.Apple.canAddPass();
            setResult(`Can add pass: ${canAdd}`);
            setError(null);
        } catch (e: any) {
            Log.hmmm(`Apple.canAddPass error: ${e}`);
            setResult(null);
            setError('Error on Apple.canAddPass');
        }
        setIsLoading(false);
    };

    const handleAndroidTest = async () => {
        setIsLoading(true);
        try {
            const hardwareId = await PushProvisioning.Google.getStableHardwareId();
            setResult(`Stable hardware ID: ${hardwareId}`);
            setError(null);
        } catch (e: any) {
            Log.hmmm(`Google.getStableHardwareId error: ${e}`);
            setResult(null);
            setError('Error on Google.getStableHardwareId');
        }
        setIsLoading(false);
    };

    const handleIosTestWrapper = () => {
        handleIosTest().catch(() => {});
    };

    const handleAndroidTestWrapper = () => {
        handleAndroidTest().catch(() => {});
    };

    return (
        <View style={{padding: 20}}>
            {Platform.OS === 'ios' && (
                <>
                    <Button
                        text="Test canAddPass (iOS)"
                        isLoading={isLoading}
                        onPress={handleIosTestWrapper} // Wrapped function to avoid direct promise
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
                        onPress={handleAndroidTestWrapper} // Wrapped function to avoid direct promise
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
