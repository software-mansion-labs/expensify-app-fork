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
        PushProvisioning.Apple.canAddPaymentPass()
            .then((canAdd) => {
                setResult(`Can add pass: ${canAdd}`);
                setError(null);
            })
            .catch((e) => {
                Log.hmmm(`[PushProvisioning] - ${e.message}`);
                setResult(null);
                setError('Error');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleAndroidTest = () => {
        setIsLoading(true);
        PushProvisioning.Google.getStableHardwareId()
            .then((hardwareId: string) => {
                setResult(`Stable device ID: ${hardwareId}`);
                setError(null);
            })
            .catch((e) => {
                Log.hmmm(`[PushProvisioning] - ${e.message}`);
                setResult(null);
                setError('Error');
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
                        text="Test can Add"
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
                        text="Test get Device ID"
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
