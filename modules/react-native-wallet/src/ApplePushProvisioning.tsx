import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import type {NativeModule} from 'react-native';

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

type ApplePushProvisioningType = NativeModule & {
    canAddPaymentPass: () => Promise<boolean>;
    startAddPaymentPass: (last4: string, cardHolder: string) => Promise<void>;
    completeAddPaymentPass: (activation: string, encryptedData: string, ephemeralKey: string) => Promise<void>;
};

const ApplePushProvisioning = (NativeModules.ApplePushProvisioning as ApplePushProvisioningType) ?? null;

const eventEmitter = ApplePushProvisioning ? new NativeEventEmitter(ApplePushProvisioning) : null;

const ApplePushProvisioningModule = {
    /**
     * Checks if a payment pass can be added.
     * @returns A promise that resolves to a boolean indicating if a payment pass can be added.
     */
    async canAddPaymentPass(): Promise<boolean> {
        try {
            return ApplePushProvisioning.canAddPaymentPass();
        } catch (e) {
            throw e;
        }
    },

    /**
     * Starts the process of adding a payment pass.
     * @param request - The request object containing the last 4 digits of the card and the card holder's name.
     * @returns A promise that resolves when the process is started.
     */
    async startAddPass(request: AddPassRequest): Promise<void> {
        try {
            return ApplePushProvisioning.startAddPaymentPass(request.last4, request.cardHolder);
        } catch (e) {
            throw e;
        }
    },

    /**
     * Completes the process of adding a payment pass.
     * @param request - The request object containing activation data, encrypted data, and ephemeral key.
     * @returns A promise that resolves when the process is completed.
     */
    async completeAddPass(request: CompletePassRequest): Promise<void> {
        try {
            return ApplePushProvisioning.completeAddPaymentPass(request.activation, request.encryptedData, request.ephemeralKey);
        } catch (e) {
            throw e;
        }
    },

    /**
     * Adds an event listener for the specified event.
     * @param event - The event name to listen for.
     * @param callback - The callback function to handle the event.
     */
    addEventListener<T extends SupportedEvents>(event: T, callback: (e: T extends 'getPassAndActivation' ? {data: GetPassAndActivationEvent} : never) => void) {
        if (!eventEmitter) {
            return;
        }
        eventEmitter.addListener(event, callback);
    },

    /**
     * Removes all listeners for the specified event.
     * @param event - The event name to remove listeners for.
     */
    removeAllListeners(event: SupportedEvents) {
        if (!eventEmitter) {
            return;
        }
        eventEmitter.removeAllListeners(event);
    },
};

export default ApplePushProvisioningModule;
export type {AddPassRequest, CompletePassRequest, GetPassAndActivationEvent};
