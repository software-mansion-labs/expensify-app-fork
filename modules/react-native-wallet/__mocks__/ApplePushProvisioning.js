import { NativeEventEmitter } from 'react-native';

const mockEventEmitter = new NativeEventEmitter();

const ApplePushProvisioning = {
  canAddPaymentPass: jest.fn(() => Promise.resolve(true)),
  startAddPaymentPass: jest.fn(() => Promise.resolve()),
  completeAddPaymentPass: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn((event, callback) => mockEventEmitter.addListener(event, callback)),
  removeAllListeners: jest.fn(event => mockEventEmitter.removeAllListeners(event)),
};

export default ApplePushProvisioning;
