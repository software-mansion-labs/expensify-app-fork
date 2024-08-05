import {NativeEventEmitter, NativeModules} from 'react-native';
import ApplePushProvisioning from '../src/ApplePushProvisioning';

// Mock NativeModules and NativeEventEmitter
jest.mock('react-native', () => {
    const NativeEventEmitterMock = {
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
    };

    const NativeModulesMock = {
        ApplePushProvisioning: {
            canAddPaymentPass: jest.fn(),
            startAddPaymentPass: jest.fn(),
            completeAddPaymentPass: jest.fn(),
        },
    };

    return {
        NativeModules: NativeModulesMock,
        NativeEventEmitter: jest.fn(() => NativeEventEmitterMock),
    };
});

describe('ApplePushProvisioning', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should check if a payment pass can be added', async () => {
        NativeModules.ApplePushProvisioning.canAddPaymentPass.mockResolvedValue(true);

        const result = await ApplePushProvisioning.canAddPaymentPass();
        expect(result).toBe(true);
        expect(NativeModules.ApplePushProvisioning.canAddPaymentPass).toHaveBeenCalled();
    });

    test('should handle error when checking if a payment pass can be added', async () => {
        NativeModules.ApplePushProvisioning.canAddPaymentPass.mockRejectedValue(new Error('Error'));

        await expect(ApplePushProvisioning.canAddPaymentPass()).rejects.toThrow('Error');
        expect(NativeModules.ApplePushProvisioning.canAddPaymentPass).toHaveBeenCalled();
    });

    test('should start adding a payment pass', async () => {
        const request = {last4: '1234', cardHolderName: 'John Doe'};
        NativeModules.ApplePushProvisioning.startAddPaymentPass.mockResolvedValue(undefined);

        await ApplePushProvisioning.startAddPaymentPass(request);
        expect(NativeModules.ApplePushProvisioning.startAddPaymentPass).toHaveBeenCalledWith(request.last4, request.cardHolderName);
    });

    test('should handle error when starting to add a payment pass', async () => {
        const request = {last4: '1234', cardHolderName: 'John Doe'};
        NativeModules.ApplePushProvisioning.startAddPaymentPass.mockRejectedValue(new Error('Error'));

        await expect(ApplePushProvisioning.startAddPaymentPass(request)).rejects.toThrow('Error');
        expect(NativeModules.ApplePushProvisioning.startAddPaymentPass).toHaveBeenCalled();
    });

    test('should complete adding a payment pass', async () => {
        const request = {
            activation: 'activationData',
            encryptedData: 'encryptedData',
            ephemeralKey: 'ephemeralKey',
        };
        NativeModules.ApplePushProvisioning.completeAddPaymentPass.mockResolvedValue(undefined);

        await ApplePushProvisioning.completeAddPaymentPass(request);
        expect(NativeModules.ApplePushProvisioning.completeAddPaymentPass).toHaveBeenCalledWith(request.activation, request.encryptedData, request.ephemeralKey);
    });

    test('should handle error when completing adding a payment pass', async () => {
        NativeModules.ApplePushProvisioning.completeAddPaymentPass.mockRejectedValue(new Error('Error'));

        await expect(
            ApplePushProvisioning.completeAddPaymentPass({
                activation: 'activationData',
                encryptedData: 'encryptedData',
                ephemeralKey: 'ephemeralKey',
            }),
        ).rejects.toThrow('Error');
        expect(NativeModules.ApplePushProvisioning.completeAddPaymentPass).toHaveBeenCalled();
    });

    test('should add an event listener', () => {
        const callback = jest.fn();
        ApplePushProvisioning.addEventListener('getPassAndActivation', callback);
        expect(NativeEventEmitter.prototype.addListener).toHaveBeenCalledWith('getPassAndActivation', callback);
    });

    test('should remove all listeners for an event', () => {
        ApplePushProvisioning.removeAllListeners('getPassAndActivation');
        expect(NativeEventEmitter.prototype.removeAllListeners).toHaveBeenCalledWith('getPassAndActivation');
    });
});
