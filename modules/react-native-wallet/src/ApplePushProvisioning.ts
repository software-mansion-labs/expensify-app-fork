import {NativeEventEmitter, NativeModules} from 'react-native';

const {RNWallet} = NativeModules as {RNWallet: any};

// Define types separately and then export them
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

const eventEmitter = new NativeEventEmitter(RNWallet);

const ApplePushProvisioningModule = {
    /**
     * Checks if a payment pass can be added.
     * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating if a payment pass can be added.
     */
    async canAddPass(): Promise<boolean> {
        return RNWallet.canAddPaymentPass();
    },

    /**
     * Starts the process of adding a payment pass.
     * @param {AddPassRequest} request - The request object containing the last 4 digits of the card and the card holder's name.
     * @returns {Promise<void>} - A promise that resolves when the process is started.
     */
    async startAddPass(request: AddPassRequest): Promise<void> {
        return RNWallet.startAddPaymentPass(request.last4, request.cardHolder);
    },

    /**
     * Completes the process of adding a payment pass.
     * @param {CompletePassRequest} request - The request object containing activation data, encrypted data, and ephemeral key.
     * @returns {Promise<void>} - A promise that resolves when the process is completed.
     */
    async completeAddPass(request: CompletePassRequest): Promise<void> {
        return RNWallet.completeAddPaymentPass(request.activation, request.encryptedData, request.ephemeralKey);
    },

    /**
     * Adds an event listener for the specified event.
     * @param {SupportedEvents} event - The event name to listen for.
     * @param {Function} callback - The callback function to handle the event.
     */
    addEventListener<T extends SupportedEvents>(event: T, callback: (e: T extends 'getPassAndActivation' ? {data: GetPassAndActivationEvent} : never) => void) {
        eventEmitter.addListener(event, callback);
    },

    /**
     * Removes all listeners for the specified event.
     * @param {SupportedEvents} event - The event name to remove listeners for.
     */
    removeAllListeners(event: SupportedEvents) {
        eventEmitter.removeAllListeners(event);
    },
};

export default ApplePushProvisioningModule;
export type {AddPassRequest, CompletePassRequest, GetPassAndActivationEvent};
