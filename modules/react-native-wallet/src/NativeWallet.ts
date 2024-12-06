import type { TurboModule } from 'react-native';
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
}

export default TurboModuleRegistry.getEnforcing<Spec>('Wallet');
