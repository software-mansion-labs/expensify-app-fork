import {NativeEventEmitter, NativeModules} from 'react-native';
import GooglePushProvisioning from '../src/GooglePushProvisioning';

// Mock NativeModules and NativeEventEmitter
jest.mock('react-native', () => {
    const NativeModulesMock = {
        GooglePushProvisioning: {
            getTokenStatus: jest.fn(),
            getActiveWalletID: jest.fn(),
            getStableHardwareId: jest.fn(),
            getEnvironment: jest.fn(),
            pushProvision: jest.fn(),
        },
    };

    const NativeEventEmitterMock = {
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
    };

    return {
        NativeModules: NativeModulesMock,
        NativeEventEmitter: jest.fn(() => NativeEventEmitterMock),
    };
});

describe('GooglePushProvisioning', () => {
    const {GooglePushProvisioning} = NativeModules;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should get token status successfully', async () => {
        (GooglePushProvisioning.getTokenStatus as jest.Mock).mockResolvedValue(1);
        const status = await GooglePushProvisioning.getTokenStatus('VISA', 'someTokenRefId');
        expect(status).toBe(1);
        expect(GooglePushProvisioning.getTokenStatus).toHaveBeenCalledWith('VISA', 'someTokenRefId');
    });

    test('should handle token status retrieval failure', async () => {
        (GooglePushProvisioning.getTokenStatus as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getTokenStatus('VISA', 'someTokenRefId')).rejects.toThrow('Failed');
        expect(GooglePushProvisioning.getTokenStatus).toHaveBeenCalledWith('VISA', 'someTokenRefId');
    });

    test('should get active wallet ID successfully', async () => {
        (GooglePushProvisioning.getActiveWalletID as jest.Mock).mockResolvedValue('walletId');
        const walletId = await GooglePushProvisioning.getActiveWalletID();
        expect(walletId).toBe('walletId');
        expect(GooglePushProvisioning.getActiveWalletID).toHaveBeenCalled();
    });

    test('should handle active wallet ID retrieval failure', async () => {
        (GooglePushProvisioning.getActiveWalletID as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getActiveWalletID()).rejects.toThrow('Failed');
        expect(GooglePushProvisioning.getActiveWalletID).toHaveBeenCalled();
    });

    test('should get stable hardware ID successfully', async () => {
        (GooglePushProvisioning.getStableHardwareId as jest.Mock).mockResolvedValue('hardwareId');
        const hardwareId = await GooglePushProvisioning.getStableHardwareId();
        expect(hardwareId).toBe('hardwareId');
        expect(GooglePushProvisioning.getStableHardwareId).toHaveBeenCalled();
    });

    test('should handle stable hardware ID retrieval failure', async () => {
        (GooglePushProvisioning.getStableHardwareId as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getStableHardwareId()).rejects.toThrow('Failed');
        expect(GooglePushProvisioning.getStableHardwareId).toHaveBeenCalled();
    });

    test('should get environment successfully', async () => {
        (GooglePushProvisioning.getEnvironment as jest.Mock).mockResolvedValue('environment');
        const environment = await GooglePushProvisioning.getEnvironment();
        expect(environment).toBe('environment');
        expect(GooglePushProvisioning.getEnvironment).toHaveBeenCalled();
    });

    test('should handle environment retrieval failure', async () => {
        (GooglePushProvisioning.getEnvironment as jest.Mock).mockRejectedValue(new Error('Failed'));
        await expect(GooglePushProvisioning.getEnvironment()).rejects.toThrow('Failed');
        expect(GooglePushProvisioning.getEnvironment).toHaveBeenCalled();
    });

    test('should push provision successfully', async () => {
        const pushRequest = {
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
        };
        (GooglePushProvisioning.pushProvision as jest.Mock).mockResolvedValue('Card successfully added to Google Pay');
        const response = await GooglePushProvisioning.pushProvision(pushRequest.opc, pushRequest.tsp, pushRequest.clientName, pushRequest.lastDigits, JSON.stringify(pushRequest.address));
        expect(response).toBe('Card successfully added to Google Pay');
        expect(GooglePushProvisioning.pushProvision).toHaveBeenCalledWith(
            pushRequest.opc,
            pushRequest.tsp,
            pushRequest.clientName,
            pushRequest.lastDigits,
            JSON.stringify(pushRequest.address),
        );
    });

    test('should handle push provision failure', async () => {
        const pushRequest = {
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
        };
        (GooglePushProvisioning.pushProvision as jest.Mock).mockRejectedValue(new Error('Provisioning failed'));
        await expect(
            GooglePushProvisioning.pushProvision(pushRequest.opc, pushRequest.tsp, pushRequest.clientName, pushRequest.lastDigits, JSON.stringify(pushRequest.address)),
        ).rejects.toThrow('Provisioning failed');
        expect(GooglePushProvisioning.pushProvision).toHaveBeenCalledWith(
            pushRequest.opc,
            pushRequest.tsp,
            pushRequest.clientName,
            pushRequest.lastDigits,
            JSON.stringify(pushRequest.address),
        );
    });
});
