import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

type WalletData = AndroidWalletData | IOSWalletData;

type AndroidWalletData = {
  platform: 'android';
  deviceID: string;
  walletAccountID: string;
};

type IOSWalletData = {
  platform: 'ios';
  nonce: string;
  nonceSignature: string;
  certificates: string;
};

type UserAddress = {
  name: string;
  addressOne: string;
  addressTwo?: string;
  administrativeArea: string;
  locality: string;
  countryCode: string;
  postalCode: string;
  phoneNumber: string;
};

type AndroidCardData = {
  platform: string;
  network: string;
  opaquePaymentCard: string;
  cardHolderName: string;
  lastDigits: string;
  userAddress: UserAddress;
};

type CardStatus =
  | 'not found'
  | 'requireActivation'
  | 'activating'
  | 'activated'
  | 'suspended'
  | 'deactivated';

type onCardActivatedPayload = {
  tokenId: string;
  cardStatus: 'activated' | 'canceled';
};

export interface Spec extends TurboModule {
  checkWalletAvailability(): Promise<boolean>;
  getSecureWalletInfo(): Promise<WalletData>;
  addCardToWallet(cardData: AndroidCardData): Promise<void>;
  getCardStatus(last4Digits: string): Promise<string>;
  getCardTokenStatus(tsp: string, tokenRefId: string): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Wallet');

export type {
  WalletData,
  AndroidWalletData,
  UserAddress,
  AndroidCardData,
  CardStatus,
  onCardActivatedPayload,
};
