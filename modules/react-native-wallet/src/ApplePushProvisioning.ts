import ReactNative from 'react-native';
import { NativeEventEmitter } from 'react-native';

interface AppleWalletModule {
    canAddPaymentPass: () => Promise<boolean>;
    startAddPaymentPass: (last4: string, cardHolderName: string) => Promise<void>;
    completeAddPaymentPass: (
        activationData: string,
        encryptedPassData: string,
        ephemeralPublicKey: string,
    ) => Promise<void>;
}

const module = ReactNative.NativeModules?.PaymentPass || {
    addListener: null,
    removeListeners: null,
};
const AppleWalletModule = module as AppleWalletModule;
const eventEmitter = new NativeEventEmitter(module);

const canAddPaymentPass = (): Promise<boolean> => {
    return AppleWalletModule.canAddPaymentPass();
};

const startAddPaymentPass = (
    last4: string,
    cardHolderName: string,
): Promise<void> => {
    return AppleWalletModule.startAddPaymentPass(last4, cardHolderName);
};

const completeAddPaymentPass = (
    activationData: string,
    encryptedPassData: string,
    ephemeralPublicKey: string,
): Promise<void> => {
    return AppleWalletModule.completeAddPaymentPass(
        activationData,
        encryptedPassData,
        ephemeralPublicKey,
    );
};

export default {
    canAddPaymentPass,
    startAddPaymentPass,
    completeAddPaymentPass,
    eventEmitter,
};