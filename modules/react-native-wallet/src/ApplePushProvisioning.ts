import { NativeModules, NativeEventEmitter } from 'react-native';

const { RNWallet } = NativeModules;

interface AddPassRequest {
    last4: string;
    cardHolder: string;
}

interface CompletePassRequest {
    activation: string;
    encryptedData: string;
    ephemeralKey: string;
}

const eventEmitter = new NativeEventEmitter(RNWallet);

const ApplePushProvisioningModule = {
    async canAddPass(): Promise<boolean> {
        try {
            return await RNWallet.canAddPass();
        } catch (error) {
            throw new Error(`Error checking add pass capability: ${error.message}`);
        }
    },
    async startAddPass(request: AddPassRequest): Promise<void> {
        try {
            return await RNWallet.startAddPass(request.last4, request.cardHolder);
        } catch (error) {
            throw new Error(`Error starting add pass: ${error.message}`);
        }
    },
    async completeAddPass(request: CompletePassRequest): Promise<void> {
        try {
            RNWallet.completeAddPass(request.activation, request.encryptedData, request.ephemeralKey);
        } catch (error) {
            throw new Error(`Error completing add pass: ${error.message}`);
        }
    },
    addEventListener(event: string, callback: (data: any) => void) {
        eventEmitter.addListener(event, callback);
    },
    removeAllListeners(event: string) {
        eventEmitter.removeAllListeners(event);
    }
};

export default ApplePushProvisioningModule;
