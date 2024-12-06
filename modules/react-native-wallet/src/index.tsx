import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import type { AndroidCardData, CardStatus } from './types';
import { getCardState } from './utils';

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

function getWalletId(): Promise<string> {
  return Wallet.getWalletId();
}

function getHardwareId(): Promise<string> {
  return Wallet.getHardwareId();
}

function checkWalletAvailability(): Promise<boolean> {
  return Wallet.checkWalletAvailability();
}

function getSecureWalletInfo(): Promise<string> {
  return Wallet.getSecureWalletInfo();
}

function addCardToWallet(cardData: AndroidCardData): void {
  return Wallet.addCardToWallet(cardData);
}

async function getCardStatus(last4Digits: string): Promise<CardStatus> {
  const cardState = await Wallet.getCardStatus(last4Digits);
  return getCardState(cardState);
}

async function getCardTokenStatus(
  tsp: string,
  tokenRefId: string
): Promise<CardStatus> {
  const tokenState = await Wallet.getCardTokenStatus(tsp, tokenRefId);
  return getCardState(tokenState);
}

const eventEmitter = new NativeEventEmitter();

function addListener(
  event: string,
  callback: (data: any) => void
): EmitterSubscription {
  return eventEmitter.addListener(event, callback);
}

function removeListener(subscription: EmitterSubscription): void {
  subscription.remove();
}

export {
  getWalletId,
  getHardwareId,
  checkWalletAvailability,
  getSecureWalletInfo,
  addCardToWallet,
  getCardStatus,
  getCardTokenStatus,
  addListener,
  removeListener,
};
