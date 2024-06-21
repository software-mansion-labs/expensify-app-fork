import { NativeModules, NativeEventEmitter } from 'react-native';

const { GooglePushProvisioning } = NativeModules;
const eventEmitter = new NativeEventEmitter(GooglePushProvisioning);

type Tsp = 'VISA' | 'MASTERCARD';

interface UserAddress {
    name: string;
    addressOne: string;
    addressTwo: string;
    locality: string;
    administrativeArea: string;
    countryCode: string;
    postalCode: string;
    phoneNumber: string;
}

interface PushTokenizeRequest {
    opc: string;
    tsp: Tsp;
    clientName: string;
    lastDigits: string;
    address: UserAddress;
}

const GooglePushProvisioningModule = {
    async getTokenStatus(tsp: Tsp, tokenReferenceId: string): Promise<number> {
        try {
            return await GooglePushProvisioning.getTokenStatus(tsp, tokenReferenceId);
        } catch (error) {
            throw new Error(`Error getting token status: ${error.message}`);
        }
    },
    async getActiveWalletID(): Promise<string> {
        try {
            return await GooglePushProvisioning.getActiveWalletID();
        } catch (error) {
            throw new Error(`Error getting active wallet ID: ${error.message}`);
        }
    },
    async getStableHardwareId(): Promise<string> {
        try {
            return await GooglePushProvisioning.getStableHardwareId();
        } catch (error) {
            throw new Error(`Error getting stable hardware ID: ${error.message}`);
        }
    },
    async getEnvironment(): Promise<string> {
        try {
            return await GooglePushProvisioning.getEnvironment();
        } catch (error) {
            throw new Error(`Error getting environment: ${error.message}`);
        }
    },
    async pushProvision(request: PushTokenizeRequest): Promise<string> {
        try {
            const addressJson = JSON.stringify(request.address);
            return await GooglePushProvisioning.pushProvision(
                request.opc,
                request.tsp,
                request.clientName,
                request.lastDigits,
                addressJson
            );
        } catch (error) {
            throw new Error(`Error during push provision: ${error.message}`);
        }
    },
    addEventListener(event: string, callback: (data: any) => void) {
        eventEmitter.addListener(event, callback);
    },
    removeAllListeners(event: string) {
        eventEmitter.removeAllListeners(event);
    }
};

export default GooglePushProvisioningModule;
