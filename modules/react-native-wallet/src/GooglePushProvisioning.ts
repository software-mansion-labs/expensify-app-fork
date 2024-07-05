import {NativeEventEmitter, NativeModules} from 'react-native';
import type {NativeModule} from 'react-native';

type Tsp = 'VISA' | 'MASTERCARD';

type UserAddress = {
    name: string;
    addressOne: string;
    addressTwo: string;
    locality: string;
    administrativeArea: string;
    countryCode: string;
    postalCode: string;
    phoneNumber: string;
};

type PushTokenizeRequest = {
    opc: string;
    tsp: Tsp;
    clientName: string;
    lastDigits: string;
    address: UserAddress;
};

type SupportedEvents = 'getActiveWalletID' | 'getStableHardwareId';

type GetActiveWalletIDEvent = {
    walletID: string;
};

type GetStableHardwareIdEvent = {
    deviceID: string;
};

type EventDataMap = {
    getActiveWalletID: GetActiveWalletIDEvent;
    getStableHardwareId: GetStableHardwareIdEvent;
};

type GooglePushProvisioningType = NativeModule & {
    getTokenStatus: (tsp: Tsp, tokenReferenceId: string) => Promise<number>;
    getActiveWalletID: () => Promise<string>;
    getStableHardwareId: () => Promise<string>;
    getEnvironment: () => Promise<string>;
    pushProvision: (opc: string, tsp: Tsp, clientName: string, lastDigits: string, addressJson: string) => Promise<string>;
};

const GooglePushProvisioning = NativeModules.GooglePushProvisioning as GooglePushProvisioningType | undefined;

const LINK_ERR = 'GooglePushProvisioning module is not linked properly.';

const eventEmitter = GooglePushProvisioning ? new NativeEventEmitter(GooglePushProvisioning) : null;

const GooglePushProvisioningModule = {
    /**
     * Retrieves the status of a token.
     * @param tsp - The token service provider (VISA or MASTERCARD).
     * @param tokenReferenceId - The token reference ID.
     * @returns A promise that resolves to the token status.
     */
    getTokenStatus(tsp: Tsp, tokenReferenceId: string): Promise<number> {
        if (!GooglePushProvisioning) return Promise.reject(LINK_ERR);
        return GooglePushProvisioning.getTokenStatus(tsp, tokenReferenceId);
    },

    /**
     * Retrieves the active wallet ID.
     * @returns A promise that resolves to the active wallet ID.
     */
    getActiveWalletID(): Promise<string> {
        if (!GooglePushProvisioning) return Promise.reject(LINK_ERR);
        return GooglePushProvisioning.getActiveWalletID();
    },

    /**
     * Retrieves the stable hardware ID.
     * @returns A promise that resolves to the stable hardware ID.
     */
    getStableHardwareId(): Promise<string> {
        if (!GooglePushProvisioning) return Promise.reject(LINK_ERR);
        return GooglePushProvisioning.getStableHardwareId();
    },

    /**
     * Retrieves the environment.
     * @returns A promise that resolves to the environment.
     */
    getEnvironment(): Promise<string> {
        if (!GooglePushProvisioning) return Promise.reject(LINK_ERR);
        return GooglePushProvisioning.getEnvironment();
    },

    /**
     * Initiates the push provisioning process.
     * @param request - The push tokenize request object.
     * @returns A promise that resolves when the push provisioning process is complete.
     */
    pushProvision(request: PushTokenizeRequest): Promise<string> {
        if (!GooglePushProvisioning) return Promise.reject(LINK_ERR);
        const addressJson = JSON.stringify(request.address);
        return GooglePushProvisioning.pushProvision(request.opc, request.tsp, request.clientName, request.lastDigits, addressJson);
    },

    /**
     * Adds an event listener for the specified event.
     * @param event - The event name to listen for.
     * @param callback - The callback function to handle the event.
     */
    addEventListener<T extends SupportedEvents>(event: T, callback: (data: EventDataMap[T]) => void) {
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

export default GooglePushProvisioningModule;
export type {PushTokenizeRequest, UserAddress, Tsp};
