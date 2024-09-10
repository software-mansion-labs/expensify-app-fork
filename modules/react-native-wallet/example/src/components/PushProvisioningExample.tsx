import {PushTokenizeRequest} from '../../../src/GooglePushProvisioning';
import PushProvisioning from '../../../src/index';
import React, {useEffect, useState} from 'react';
import {View, Text, Button, Alert} from 'react-native';

const PushProvisioningExample = () => {
  const [canAddApplePass, setCanAddApplePass] = useState<boolean | null>(null);
  const [activeWalletID, setActiveWalletID] = useState<string | null>(null);

  useEffect(() => {
    // Check if Apple payment pass can be added
    PushProvisioning.Apple.canAddPaymentPass()
      .then(setCanAddApplePass)
      .catch((error: {message: string | undefined}) =>
        Alert.alert('Error', error.message),
      );

    // Get active wallet ID for Google
    PushProvisioning.Google.getActiveWalletID()
      .then(setActiveWalletID)
      .catch((error: {message: string | undefined}) =>
        Alert.alert('Error', error.message),
      );
  }, []);

  const handleAddApplePass = () => {
    PushProvisioning.Apple.startAddPaymentPass({
      last4: '1234',
      cardHolderName: 'John Doe',
    })
      .then(() => Alert.alert('Success', 'Apple payment pass started'))
      .catch((error: {message: string | undefined}) =>
        Alert.alert('Error', error.message),
      );
  };

  const handlePushProvisionGoogle = () => {
    const request: PushTokenizeRequest = {
      opc: 'sample-opc',
      tsp: 'VISA',
      clientName: 'John Doe',
      lastDigits: '1234',
      address: {
        name: 'John Doe',
        addressOne: '123 Main St',
        addressTwo: '',
        locality: 'City',
        administrativeArea: 'State',
        countryCode: 'US',
        postalCode: '12345',
        phoneNumber: '1234567890',
      },
    };

    PushProvisioning.Google.pushProvision(request)
      .then((response: string | undefined) => Alert.alert('Success', response))
      .catch((error: {message: string | undefined}) =>
        Alert.alert('Error', error.message),
      );
  };

  return (
    <View style={{padding: 20}}>
      <Text>Apple Push Provisioning</Text>
      <Text>
        Can Add Payment Pass:{' '}
        {canAddApplePass !== null ? canAddApplePass.toString() : 'Loading...'}
      </Text>
      <Button title="Add Apple Payment Pass" onPress={handleAddApplePass} />

      <Text style={{marginTop: 20}}>Google Push Provisioning</Text>
      <Text>Active Wallet ID: {activeWalletID || 'Loading...'}</Text>
      <Button
        title="Push Provision Google"
        onPress={handlePushProvisionGoogle}
      />
    </View>
  );
};

export default PushProvisioningExample;
