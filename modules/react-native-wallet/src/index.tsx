import { NativeModules, Platform } from 'react-native';
import type { AndroidCardData } from './types';

const LINKING_ERROR =
  `The package 'react-native-wallet' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const WalletModule = isTurboModuleEnabled
  ? require('./NativeWallet').default
  : NativeModules.Wallet;

const Wallet = WalletModule
  ? WalletModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function getWalletId(): Promise<string> {
  return Wallet.getWalletId();
}

export function getHardwareId(): Promise<string> {
  return Wallet.getHardwareId();
}

export function checkWalletAvailability(): Promise<boolean> {
  return Wallet.checkWalletAvailability();
}

export function getSecureWalletInfo(): Promise<string> {
  return Wallet.getSecureWalletInfo();
}

export function addCardToWallet(cardData: AndroidCardData): void {
  return Wallet.addCardToWallet(cardData);
}
