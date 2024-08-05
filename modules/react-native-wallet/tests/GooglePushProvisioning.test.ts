import {NativeEventEmitter, NativeModules} from 'react-native';
import GooglePushProvisioning from '../src/GooglePushProvisioning';

// Mock NativeModules and NativeEventEmitter
jest.mock('react-native', () => ({
    NativeModules: {
        GooglePushProvisioning: {
            getTokenStatus: jest.fn(),
            getActiveWalletID: jest.fn(),
            getStableHardwareId: jest.fn(),
            getEnvironment: jest.fn(),
            pushProvision: jest.fn(),
        },
    },
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
    })),
}));

describe('GooglePushProvisioning', () => {
    const {GooglePushProvisioning} = NativeModules;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should get token status successfully', async () => {
        (GooglePushProvisioning.getTokenStatus as jest.Mock).mockResolvedValue(1);
        const status = await GooglePushProvisioning.getTokenStatus('VISA', 'someTokenRefId');
        expect(status).toBe(1);
    });

    test('should handle token status retrieval failure', async () => {
        (GooglePushProvisioning.getTokenStatus as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getTokenStatus('VISA', 'someTokenRefId')).rejects.toThrow('Failed');
    });

    test('should get active wallet ID successfully', async () => {
        (GooglePushProvisioning.getActiveWalletID as jest.Mock).mockResolvedValue('walletId');
        const walletId = await GooglePushProvisioning.getActiveWalletID();
        expect(walletId).toBe('walletId');
    });

    test('should handle active wallet ID retrieval failure', async () => {
        (GooglePushProvisioning.getActiveWalletID as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getActiveWalletID()).rejects.toThrow('Failed');
    });

    test('should get stable hardware ID successfully', async () => {
        (GooglePushProvisioning.getStableHardwareId as jest.Mock).mockResolvedValue('hardwareId');
        const hardwareId = await GooglePushProvisioning.getStableHardwareId();
        expect(hardwareId).toBe('hardwareId');
    });

    test('should handle stable hardware ID retrieval failure', async () => {
        (GooglePushProvisioning.getStableHardwareId as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getStableHardwareId()).rejects.toThrow('Failed');
    });

    test('should get environment successfully', async () => {
        (GooglePushProvisioning.getEnvironment as jest.Mock).mockResolvedValue('environment');
        const environment = await GooglePushProvisioning.getEnvironment();
        expect(environment).toBe('environment');
    });

    test('should handle environment retrieval failure', async () => {
        (GooglePushProvisioning.getEnvironment as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getEnvironment()).rejects.toThrow('Failed');
    });

    test('should push provision successfully', async () => {
        (GooglePushProvisioning.pushProvision as jest.Mock).mockResolvedValue('Card successfully added to Google Pay');
        const response = await GooglePushProvisioning.pushProvision({
            opc: 'opc',
            tsp: 'VISA',
            clientName: 'clientName',
            lastDigits: '1234',
            address: {
                name: 'John Doe',
                addressOne: '123 Main St',
                addressTwo: 'Apt 4B',
                locality: 'Metropolis',
                administrativeArea: 'NY',
                countryCode: 'US',
                postalCode: '10001',
                phoneNumber: '555-555-5555',
            },
        });
        expect(response).toBe('Card successfully added to Google Pay');
    });

    test('should handle push provision failure', async () => {
        (GooglePushProvisioning.pushProvision as jest.Mock).mockRejectedValue(new Error('Provisioning failed'));
        await expect(
            GooglePushProvisioning.pushProvision({
                opc: 'opc',
                tsp: 'VISA',
                clientName: 'clientName',
                lastDigits: '1234',
                address: {
                    name: 'John Doe',
                    addressOne: '123 Main St',
                    addressTwo: 'Apt 4B',
                    locality: 'Metropolis',
                    administrativeArea: 'NY',
                    countryCode: 'US',
                    postalCode: '10001',
                    phoneNumber: '555-555-5555',
                },
            }),
        ).rejects.toThrow('Provisioning failed');
    });
});
