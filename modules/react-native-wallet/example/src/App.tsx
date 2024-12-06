import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button as RNButton,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import {
  checkWalletAvailability,
  getSecureWalletInfo,
  addCardToWallet,
  getCardStatus,
  getCardTokenStatus,
  addListener,
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

const TOKEN_REF_ID = 'tokenID123';

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
  const [cardStatus, setCardStatus] = useState<string | undefined>();
  const [tokenStatus, setTokenStatus] = useState<string | undefined>();
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

  const handleGetCardStatus = useCallback(() => {
    getCardStatus(dummyCardData.lastDigits).then(setCardStatus);
  }, []);

  const handleGetCardTokenStatus = useCallback(() => {
    getCardTokenStatus(dummyCardData.network, TOKEN_REF_ID).then(
      setTokenStatus
    );
  }, []);

  const handleAddCardToWallet = useCallback(() => {
    addCardToWallet(dummyCardData);
    setAddCard('Completed');
  }, []);

  useEffect(() => {
    const subscription = addListener('onCardActivated', (data) => {
      Alert.alert('onCardActivated listener', JSON.stringify(data));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>react-native-wallet example app</Text>
      <Button
        title="checkWalletAvailability"
        onPress={handleCheckWalletAvailability}
      />
      <Text>{`checkWalletAvailability() -> ${walletAvailability}`}</Text>

      <Button title="getSecureWalletInfo" onPress={handleGetSecureWalletInfo} />
      <Text>{`getSecureWalletInfo() -> {\n\t\tplatform: ${walletData?.platform}\n\t\twalletId: ${walletData?.walletAccountID}\n\t\thardwareId: ${walletData?.deviceID}\n}`}</Text>

      <Button title="getCardStatus" onPress={handleGetCardStatus} />
      <Text>{`getCardStatus(${dummyCardData.lastDigits}) -> ${cardStatus}`}</Text>

      <Button title="getCardTokenStatus" onPress={handleGetCardTokenStatus} />
      <Text>{`getCardTokenStatus(${TOKEN_REF_ID}) -> ${tokenStatus}`}</Text>

      <Button title="addCardToWallet" onPress={handleAddCardToWallet} />
      <Text>{`addCardToWallet() -> ${addCard}`}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
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
    marginBottom: 40,
  },
});
