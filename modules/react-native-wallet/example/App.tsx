import React, {useState} from 'react';
import {Alert, Button, Text, View} from 'react-native';
import PushProvisioning from '../src';

const App = () => {
    const [canAdd, setCanAdd] = useState<boolean | null>(null);
    const [status, setStatus] = useState<string | null>(null);

    const checkCanAddPaymentPass = async () => {
        try {
            const result = await PushProvisioning.Apple.canAddPaymentPass();
            setCanAdd(result);
            Alert.alert('Can Add Payment Pass', `Can add: ${result}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to check if payment pass can be added.');
        }
    };

    const startAddingPaymentPass = async () => {
        try {
            const request = {
                last4: '1234',
                cardHolder: 'John Doe',
            };
            await PushProvisioning.Apple.startAddPaymentPass(request);
            Alert.alert('Success', 'Started adding payment pass.');
        } catch (error) {
            Alert.alert('Error', 'Failed to start adding payment pass.');
        }
    };

    const completeAddingPaymentPass = async () => {
        try {
            const request = {
                activation: 'activationData',
                encryptedData: 'encryptedData',
                ephemeralKey: 'ephemeralKey',
            };
            await PushProvisioning.Apple.completeAddPaymentPass(request);
            Alert.alert('Success', 'Completed adding payment pass.');
        } catch (error) {
            Alert.alert('Error', 'Failed to complete adding payment pass.');
        }
    };

    const getTokenStatus = async () => {
        try {
            const status = await PushProvisioning.Google.getTokenStatus('VISA', 'someTokenRefId');
            setStatus(`Token status: ${status}`);
            Alert.alert('Token Status', `Status: ${status}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to get token status.');
        }
    };

    return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text>React Native Wallet Example</Text>
            <Button
                title="Check if Payment Pass Can Be Added"
                onPress={checkCanAddPaymentPass}
            />
            <Button
                title="Start Adding Payment Pass"
                onPress={startAddingPaymentPass}
            />
            <Button
                title="Complete Adding Payment Pass"
                onPress={completeAddingPaymentPass}
            />
            <Button
                title="Get Token Status"
                onPress={getTokenStatus}
            />
            {status && <Text>{status}</Text>}
            {canAdd !== null && <Text>Can add payment pass: {canAdd ? 'Yes' : 'No'}</Text>}
        </View>
    );
};

export default App;
