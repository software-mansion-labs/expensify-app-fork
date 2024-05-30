import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import ApplePushProvisioningModule from './ApplePushProvisioning';
import GooglePushProvisioningModule from './GooglePushProvisioning';

// Simulate API calls and responses (Replace with actual Expensify API calls)
async function callAPI(command: string, data: any): Promise<{ data: any }> {
    // Placeholder for simulating API responses
    try {
        console.log("API call:", command, "Data:", data);

        // Simulate API response structure (replace with actual API response later)
        if (command === "startCreateAppleWalletProvisioningRequest") {
            return Promise.resolve({
                data: {
                    provisioningData: {
                        ephemeralPublicKey: "simulatedEphemeralPublicKey",
                        activationData: "simulatedActivationData",
                        encryptedPassData: "simulatedEncryptedPassData"
                    }
                }
            });
        } else if (command === "startCreateGooglePayProvisioningRequest") {
            return Promise.resolve({
                data: {
                    provisioningData: {
                        opaquePaymentCard: "simulatedOpaquePaymentCard",
                        userAddress: "simulatedUserAddress",
                        network: "simulatedNetwork",
                        tokenServiceProvider: "simulatedTokenServiceProvider",
                        displayName: "simulatedDisplayName",
                        lastDigits: "1234",
                        walletAccountId: "simulatedWalletAccountId",
                    }
                }
            });
        }
        return Promise.resolve({ data: {} });
    } catch (error) {
        console.error("API call error:", error);
        throw error;
    }
}

interface WalletAdditionParams {
    data: {
        cardholderName?: string;
        primaryAccountNumberSuffix?: string;
    };
}

async function completeAddApplePaymentPass({ res }: { res: { data: any } }) {
    try {
        const { ephemeralPublicKey, activationData, encryptedPassData } = res.data.provisioningData || {};

        if (ephemeralPublicKey && activationData && encryptedPassData) {
            await ApplePushProvisioningModule.completeAddPaymentPass(
                activationData,
                encryptedPassData,
                ephemeralPublicKey,
            );

            // Optionally log or track success
            console.log("Added card to Apple Wallet");
        } else {
            // Handle the error appropriately
            console.error("Apple Wallet Completion Error: Missing provisioning data");
        }
    } catch (e) {
        // Handle the error appropriately
        console.error("Apple Wallet Completion Error:", e);
    }
}

export async function startAddToAppleWallet({ data }: WalletAdditionParams) {
    if (Platform.OS !== 'ios') {
        console.error("Apple Pay is not supported on this platform");
        return; 
    }
    try {
        const appVersion = DeviceInfo.getVersion();
        const { cardholderName, primaryAccountNumberSuffix } = data;

        await ApplePushProvisioningModule.startAddPaymentPass(
            primaryAccountNumberSuffix!,
            cardholderName!,
        );

        ApplePushProvisioningModule.eventEmitter.addListener(
            'getPassAndActivation',
            async ({ data: certs }) => {
                try {
                    ApplePushProvisioningModule.eventEmitter.removeAllListeners('getPassAndActivation');
                    const {
                        certificateLeaf: cert1,
                        certificateSubCA: cert2,
                        nonce,
                        nonceSignature,
                    }: any = certs || {};

                    // Simulate API calls and responses (Replace with actual Expensify API calls)
                    const res = await callAPI(
                        "startCreateAppleWalletProvisioningRequest",
                        {
                            appVersion,
                            cert1,
                            cert2,
                            nonce,
                            nonceSignature,
                            walletProvider: 'apple',
                        },
                    );
                    await completeAddApplePaymentPass({ res });
                } catch (error) {
                    // Handle the error appropriately
                    console.error("Error in getPassAndActivation listener:", error);
                }
            },
        );
    } catch (e) {
        // Handle the error appropriately
        console.error("Apple Wallet Error:", e);
    }
}

export async function startAddToGooglePay({ data }: WalletAdditionParams) {
    if (Platform.OS !== 'android') {
        console.error("Google Pay is not supported on this platform");
        return; 
    }
    try {
        const appVersion = DeviceInfo.getVersion();
        const deviceId = await DeviceInfo.getUniqueId();

        // Simulate API calls and responses (Replace with actual Expensify API calls)
        const res = await callAPI("startCreateGooglePayProvisioningRequest", {
            appVersion,
            deviceId,
            walletProvider: 'google',
        });

        const {
            opaquePaymentCard,
            userAddress,
            network,
            tokenServiceProvider,
            displayName,
            lastDigits,
            walletAccountId,
        } = res.data.provisioningData;

        if (opaquePaymentCard) {
            const { cardholderName, primaryAccountNumberSuffix } = data;
            await GooglePushProvisioningModule.startPushProvision(
                opaquePaymentCard,
                cardholderName!,
                primaryAccountNumberSuffix!,
            );

            // Handle the returned Android specific values (e.g., display confirmation)
            console.log("Added card to Google Pay. Additional details:", {
                userAddress,
                network,
                tokenServiceProvider,
                displayName,
                lastDigits,
                walletAccountId,
            });
        } else {
            // Handle the error appropriately
            console.error("Google Pay Error: Missing OPC");
        }
    } catch (e) {
        // Handle the error appropriately
        console.error("Google Pay Error:", e);
    }
}