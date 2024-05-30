import ReactNative from 'react-native';
import { NativeEventEmitter } from 'react-native';

interface GooglePushProvisioningModule {
    startPushProvision: (
        opc: string,
        name: string,
        lastFourDigits: string,
    ) => Promise<void>;
}

const module = ReactNative.NativeModules?.GooglePushProvisioning || {
    addListener: null,
    removeListeners: null,
};
const GooglePushProvisioning = module as GooglePushProvisioningModule;
const eventEmitter = new NativeEventEmitter(module);

const startPushProvision = (
    opc: string,
    name: string,
    lastFourDigits: string,
): Promise<void> => {
    return GooglePushProvisioning.startPushProvision(opc, name, lastFourDigits);
};

export default {
    startPushProvision,
    eventEmitter,
};