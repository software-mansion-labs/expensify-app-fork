import type { TurboModule, EmitterSubscription } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { AndroidCardData, WalletData } from './types';

export interface Spec extends TurboModule {
  getWalletId(): Promise<string>;
  getHardwareId(): Promise<string>;
  checkWalletAvailability(): Promise<boolean>;
  getSecureWalletInfo(): Promise<WalletData>;
  addCardToWallet(cardData: AndroidCardData): void;
  getCardStatus(last4Digits: string): Promise<string>;
  getCardTokenStatus(tsp: string, tokenRefId: string): Promise<string>;
  addListener(
    event: string,
    callback: (data: any) => void
  ): EmitterSubscription;
  removeListener(subscription: EmitterSubscription): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Wallet');
