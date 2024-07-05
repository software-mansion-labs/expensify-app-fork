import {NativeEventEmitter, NativeModules} from 'react-native';
import type {NativeModule} from 'react-native';

type RNWalletType = NativeModule & {
    canAddPaymentPass: () => Promise<boolean>;
    startAddPaymentPass: (last4: string, cardHolder: string) => Promise<void>;
    completeAddPaymentPass: (activation: string, encryptedData: string, ephemeralKey: string) => Promise<void>;
};

type AddPassRequest = {
    last4: string;
    cardHolder: string;
};

type CompletePassRequest = {
    activation: string;
    encryptedData: string;
    ephemeralKey: string;
};

type GetPassAndActivationEvent = {
    certificateLeaf: string;
    certificateSubCA: string;
    nonce: string;
    nonceSignature: string;
};

type SupportedEvents = 'addPaymentPassViewControllerDidFinish' | 'getPassAndActivation';

const ApplePushProvisioning = NativeModules.RNWallet as RNWalletType | undefined;

const LINK_ERR = 'ApplePushProvisioning module is not linked properly.';

const eventEmitter = ApplePushProvisioning ? new NativeEventEmitter(ApplePushProvisioning) : null;

const ApplePushProvisioningModule = {
    /**
     * Checks if a payment pass can be added.
     * @returns A promise that resolves to a boolean indicating if a payment pass can be added.
     */
    canAddPass(): Promise<boolean> {
        if (!ApplePushProvisioning) return Promise.reject(LINK_ERR);
        return ApplePushProvisioning.canAddPaymentPass();
    },

    /**
     * Starts the process of adding a payment pass.
     * @param request - The request object containing the last 4 digits of the card and the card holder's name.
     * @returns A promise that resolves when the process is started.
     */
    startAddPass(request: AddPassRequest): Promise<void> {
        if (!ApplePushProvisioning) return Promise.reject(LINK_ERR);
        return ApplePushProvisioning.startAddPaymentPass(request.last4, request.cardHolder);
    },

    /**
     * Completes the process of adding a payment pass.
     * @param request - The request object containing activation data, encrypted data, and ephemeral key.
     * @returns A promise that resolves when the process is completed.
     */
    completeAddPass(request: CompletePassRequest): Promise<void> {
        if (!ApplePushProvisioning) return Promise.reject(LINK_ERR);
        return ApplePushProvisioning.completeAddPaymentPass(request.activation, request.encryptedData, request.ephemeralKey);
    },

    /**
     * Adds an event listener for the specified event.
     * @param event - The event name to listen for.
     * @param callback - The callback function to handle the event.
     */
    addEventListener<T extends SupportedEvents>(event: T, callback: (e: T extends 'getPassAndActivation' ? {data: GetPassAndActivationEvent} : never) => void) {
        if (eventEmitter) {
            eventEmitter.addListener(event, callback);
        } else {
            console.error('Event emitter is not initialized.');
        }
    },

    /**
     * Removes all listeners for the specified event.
     * @param event - The event name to remove listeners for.
     */
    removeAllListeners(event: SupportedEvents) {
        if (eventEmitter) {
            eventEmitter.removeAllListeners(event);
        } else {
            console.error('Event emitter is not initialized.');
        }
    },
};

export default ApplePushProvisioningModule;
export type {AddPassRequest, CompletePassRequest, GetPassAndActivationEvent};
