import {NativeEventEmitter, NativeModules} from 'react-native';

const {RNWallet} = NativeModules;

type AddPassRequest = {
    last4: string;
    cardHolder: string;
};

type CompletePassRequest = {
    activation: string;
    encryptedData: string;
    ephemeralKey: string;
};

type SupportedEvents = 'addPaymentPassViewControllerDidFinish' | 'getPassAndActivation';

const eventEmitter = new NativeEventEmitter(RNWallet);

const ApplePushProvisioningModule = {
    async canAddPass(): Promise<boolean> {
        try {
            return await RNWallet.canAddPaymentPass();
        } catch {
            throw new Error('Error checking add pass capability.');
        }
    },
    async startAddPass(request: AddPassRequest): Promise<void> {
        try {
            return await RNWallet.startAddPaymentPass(request.last4, request.cardHolder);
        } catch (e) {
            throw e;
        }
    },
    async completeAddPass(request: CompletePassRequest): Promise<void> {
        try {
            return await RNWallet.completeAddPaymentPass(request.activation, request.encryptedData, request.ephemeralKey);
        } catch (e) {
            throw e;
        }
    },
    addEventListener<T extends SupportedEvents>(
        event: T,
        callback: (
            e: T extends 'getPassAndActivation'
                ? {
                      data: {
                          certificateLeaf: string;
                          certificateSubCA: string;
                          nonce: string;
                          nonceSignature: string;
                      };
                  }
                : never,
        ) => void,
    ) {
        eventEmitter.addListener(event, callback);
    },

    removeAllListeners(event: SupportedEvents) {
        eventEmitter.removeAllListeners(event);
    },
};

export default ApplePushProvisioningModule;
