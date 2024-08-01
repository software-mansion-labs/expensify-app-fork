import ApplePushProvisioning from '../src/ApplePushProvisioning';
import { NativeEventEmitter } from 'react-native';

describe('ApplePushProvisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check if a payment pass can be added', async () => {
    const result = await ApplePushProvisioning.canAddPaymentPass();
    expect(result).toBe(true);
  });

  it('should start adding a payment pass', async () => {
    const request = { last4: '1234', cardHolder: 'John Doe' };
    await ApplePushProvisioning.startAddPaymentPass(request);
    expect(ApplePushProvisioning.startAddPaymentPass).toHaveBeenCalledWith(request.last4, request.cardHolder);
  });

  it('should complete adding a payment pass', async () => {
    const request = {
      activation: 'activationData',
      encryptedData: 'encryptedData',
      ephemeralKey: 'ephemeralKey',
    };
    await ApplePushProvisioning.completeAddPaymentPass(request);
    expect(ApplePushProvisioning.completeAddPaymentPass).toHaveBeenCalledWith(
      request.activation,
      request.encryptedData,
      request.ephemeralKey
    );
  });

  it('should add an event listener', () => {
    const callback = jest.fn();
    ApplePushProvisioning.addEventListener('getPassAndActivation', callback);
    expect(ApplePushProvisioning.addEventListener).toHaveBeenCalledWith('getPassAndActivation', callback);
  });

  it('should remove all listeners for an event', () => {
    ApplePushProvisioning.removeAllListeners('getPassAndActivation');
    expect(ApplePushProvisioning.removeAllListeners).toHaveBeenCalledWith('getPassAndActivation');
  });
});
