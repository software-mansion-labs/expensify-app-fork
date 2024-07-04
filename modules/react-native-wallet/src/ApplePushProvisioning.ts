import { NativeEventEmitter, NativeModules } from 'react-native';

const { RNWallet } = NativeModules;

export type AddPassRequest = {
    last4: string;
    cardHolder: string;
};

export type CompletePassRequest = {
    activation: string;
    encryptedData: string;
    ephemeralKey: string;
};

export type GetPassAndActivationEvent = {
    certificateLeaf: string;
    certificateSubCA: string;
    nonce: string;
    nonceSignature: string;
};

type SupportedEvents = 'addPaymentPassViewControllerDidFinish' | 'getPassAndActivation';

const eventEmitter = new NativeEventEmitter(RNWallet);

const ApplePushProvisioningModule = {
    async canAddPass(): Promise<boolean> {
        return RNWallet.canAddPaymentPass();
    },
    async startAddPass(request: AddPassRequest): Promise<void> {
        return RNWallet.startAddPaymentPass(request.last4, request.cardHolder);
    },
    async completeAddPass(request: CompletePassRequest): Promise<void> {
        return RNWallet.completeAddPaymentPass(request.activation, request.encryptedData, request.ephemeralKey);
    },
    addEventListener<T extends SupportedEvents>(
        event: T,
        callback: (
            e: T extends 'getPassAndActivation'
                ? { data: GetPassAndActivationEvent }
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
