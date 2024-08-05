import { NativeModules, NativeEventEmitter } from 'react-native';
import ApplePushProvisioning from '../src/ApplePushProvisioning';

jest.mock('react-native', () => {
  const NativeEventEmitterMock = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
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

  it('should check if a payment pass can be added', async () => {
    NativeModules.ApplePushProvisioning.canAddPaymentPass.mockResolvedValue(true);

    const result = await ApplePushProvisioning.canAddPaymentPass();
    expect(result).toBe(true);
    expect(NativeModules.ApplePushProvisioning.canAddPaymentPass).toHaveBeenCalled();
  });

  it('should start adding a payment pass', async () => {
    const request = { last4: '1234', cardHolderName: 'John Doe' };
    NativeModules.ApplePushProvisioning.startAddPaymentPass.mockResolvedValue(undefined);

    await ApplePushProvisioning.startAddPaymentPass(request.last4, request.cardHolderName);
    expect(NativeModules.ApplePushProvisioning.startAddPaymentPass).toHaveBeenCalledWith(request.last4, request.cardHolderName);
  });

  it('should complete adding a payment pass', async () => {
    const request = {
      activationData: 'activationData',
      encryptedPassData: 'encryptedData',
      ephemeralPublicKey: 'ephemeralKey',
    };
    NativeModules.ApplePushProvisioning.completeAddPaymentPass.mockResolvedValue(undefined);

    await ApplePushProvisioning.completeAddPaymentPass(request.activationData, request.encryptedPassData, request.ephemeralPublicKey);
    expect(NativeModules.ApplePushProvisioning.completeAddPaymentPass).toHaveBeenCalledWith(
      request.activationData,
      request.encryptedPassData,
      request.ephemeralPublicKey
    );
  });

  it('should add an event listener', () => {
    const callback = jest.fn();
    ApplePushProvisioning.addEventListener('getPassAndActivation', callback);
    expect(NativeEventEmitter.prototype.addListener).toHaveBeenCalledWith('getPassAndActivation', callback);
  });

  it('should remove all listeners for an event', () => {
    ApplePushProvisioning.removeAllListeners('getPassAndActivation');
    expect(NativeEventEmitter.prototype.removeListeners).toHaveBeenCalledWith('getPassAndActivation');
  });
});
