import { useCallback, useState } from 'react';
import { Button as RNButton, StyleSheet, Text, View } from 'react-native';
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

const dummyCardData: AndroidCardData = {
  platform: 'android',
  network: 'VISA',
  opaquePaymentCard: 'encryptedCardInformation123456',
  cardHolderName: 'John Doe',
  lastDigits: '4321',
  userAddress: dummyAddress,
};

type TestButtonProps = {
  title: string;
  onPress: () => void;
};

function Button({ title, onPress }: TestButtonProps) {
  return <RNButton title={title} onPress={onPress} color="#d57b9c" />;
}

export default function App() {
  const [walletAvailability, setWalletAvailability] = useState<
    boolean | undefined
  >();
  const [walletData, setWalletData] = useState<AndroidWalletData | undefined>();
  const [addCard, setAddCard] = useState<string | undefined>();

  const handleCheckWalletAvailability = useCallback(() => {
    if (!walletAvailability) {
      checkWalletAvailability().then(setWalletAvailability);
    } else {
      setWalletAvailability(undefined);
    }
  }, [walletAvailability]);

  const handleGetSecureWalletInfo = useCallback(() => {
    if (!walletData) {
      getSecureWalletInfo().then((x) => {
        const data: AndroidWalletData = JSON.parse(x);
        setWalletData(data);
      });
    } else {
      setWalletData(undefined);
    }
  }, [walletData]);

  const handleAddCardToWallet = useCallback(() => {
    addCardToWallet(dummyCardData);
    setAddCard('Completed');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>react-native-wallet example app</Text>
      <Button
        title="checkWalletAvailability"
        onPress={handleCheckWalletAvailability}
      />
      <Text>{`checkWalletAvailability() -> ${walletAvailability}`}</Text>

      <Button title="getSecureWalletInfo" onPress={handleGetSecureWalletInfo} />
      <Text>{`getSecureWalletInfo() -> {\n\t\tplatform: ${walletData?.platform}\n\t\twalletId: ${walletData?.walletAccountID}\n\t\thardwareId: ${walletData?.deviceID}\n}`}</Text>

      <Button title="addCardToWallet" onPress={handleAddCardToWallet} />
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
