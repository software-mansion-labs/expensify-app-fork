import { useCallback, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  checkWalletAvailability,
  getSecureWalletInfo,
  addCardToWallet,
} from 'react-native-wallet';
import type {
  AndroidCardData,
  AndroidWalletData,
  UserAddress,
} from '../../src/types';

export default function App() {
  const [walletAvailability, setWalletAvailability] = useState<
    boolean | undefined
  >();
  const [walletData, setWalletData] = useState<AndroidWalletData | undefined>();
  const [addCard, setAddCard] = useState<string | undefined>();

  const walletCall1 = useCallback(() => {
    if (!walletAvailability) {
      checkWalletAvailability().then(setWalletAvailability);
    } else {
      setWalletAvailability(undefined);
    }
  }, [walletAvailability]);

  const walletCall2 = useCallback(() => {
    if (!walletData) {
      getSecureWalletInfo().then((x) => {
        const data: AndroidWalletData = JSON.parse(x);
        setWalletData(data);
      });
    } else {
      setWalletData(undefined);
    }
  }, [walletData]);

  const dummyAddress: UserAddress = {
    name: 'John Doe',
    addressOne: '1234 Fictional Road',
    addressTwo: 'Unit 5678',
    administrativeArea: 'Imaginary State',
    locality: '9090',
    countryCode: 'XX',
    postalCode: '99999',
    phoneNumber: '000-123-4567',
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dummyCardData: AndroidCardData = {
    platform: 'android',
    network: 'VISA',
    opaquePaymentCard: 'encryptedCardInformation123456',
    cardHolderName: 'John Doe',
    lastDigits: '4321',
    userAddress: dummyAddress,
  };

  const walletCall3 = useCallback(() => {
    addCardToWallet(dummyCardData);
    setAddCard('Completed');
  }, [dummyCardData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>react-native-wallet example app</Text>
      <Button
        title="checkWalletAvailability"
        onPress={walletCall1}
        color="#d57b9c"
      />
      <Text>{`checkWalletAvailability() -> ${walletAvailability}`}</Text>
      <Button
        title="getSecureWalletInfo"
        onPress={walletCall2}
        color="#d57b9c"
      />
      <Text>{`getSecureWalletInfo() -> {\n\t\tplatform: ${walletData?.platform}\n\t\twalletId: ${walletData?.walletAccountID}\n\t\thardwareId: ${walletData?.deviceID}\n}`}</Text>
      <Button title="addCardToWallet" onPress={walletCall3} color="#d57b9c" />
      <Text>{`addCardToWallet() -> ${addCard}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 100,
  },
});
