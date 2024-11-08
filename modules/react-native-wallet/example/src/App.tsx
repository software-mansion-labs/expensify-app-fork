import React, {useState} from 'react';
import {Button, Platform, SafeAreaView, ScrollView, Text} from 'react-native';
import PushProvisioning from 'react-native-wallet';

type FetchDataHandler = (methodName: string, method: () => Promise<any>) => void;

const AppleMethods: React.FC<{handleFetchData: FetchDataHandler}> = ({handleFetchData}) => (
    <>
        <Button
            title="Can Add Payment Pass (Apple)"
            onPress={() => handleFetchData('canAddPaymentPass', PushProvisioning.Apple.canAddPaymentPass)}
        />
        <Button
            title="Start Add Payment Pass (Apple)"
            onPress={() =>
                handleFetchData('startAddPaymentPass', () =>
                    PushProvisioning.Apple.startAddPaymentPass({
                        last4: '1234',
                        cardHolderName: 'John Doe',
                    }),
                )
            }
        />
        <Button
            title="Complete Add Payment Pass (Apple)"
            onPress={() =>
                handleFetchData('completeAddPaymentPass', () =>
                    PushProvisioning.Apple.completeAddPaymentPass({
                        activation: 'activationData',
                        encryptedData: 'encryptedPassData',
                        ephemeralKey: 'ephemeralPublicKey',
                    }),
                )
            }
        />
    </>
);

const GoogleMethods: React.FC<{handleFetchData: FetchDataHandler}> = ({handleFetchData}) => (
    <>
        <Button
            title="Get Active Wallet ID (Google)"
            onPress={() => handleFetchData('getActiveWalletID', PushProvisioning.Google.getActiveWalletID)}
        />
        <Button
            title="Get Stable Hardware ID (Google)"
            onPress={() => handleFetchData('getStableHardwareId', PushProvisioning.Google.getStableHardwareId)}
        />
        <Button
            title="Get Token Status (Google)"
            onPress={() => handleFetchData('getTokenStatus', () => PushProvisioning.Google.getTokenStatus('VISA', 'DNITHE382429844212884481'))}
        />
        <Button
            title="Push Provision (Google)"
            onPress={() => {
                const expensifyCard = {
                    cardToken: '14779334-0-V',
                    displayName: 'Visa Card',
                    lastDigits: '8566',
                    network: 'Visa',
                    opaquePaymentCard:
                        'eyJraWQiOiJVN1o3Rk9FOUhEUVgyTlJWOFM1VDIxSk5TN1hFNkRybTVIVVJxZktqWF9LdmV2dDRzIiwidHlwIjoiSk9TRSIsImNoYW5uZWxTZWN1cml0eUNvbnRleHQiOiJTSEFSRURfU0VDUkVUIiwiZW5jIjoiQTI1NkdDTSIsInRhZyI6IkpmV1IwRHpoLTdLTHNLNEw0RFcyRnciLCJpYXQiOjE3Mjk3Nzc0MjQsImFsZyI6IkEyNTZHQ01LVyIsIml2IjoiZ1I3YUVtbXd6aTd2TEgzaCJ9.jAZnVE-mJyTNfoyc1ZbjtdBoGJh3l6bakKaBrHpm6hg.aSKUjZox-8hJoEO2.rbJolO209xChTtIlHFpt6Z1TugvJcgyFeSC26l_vzUTvQjc6Jjo_O9XRsn-QdyYfAFPbo1C0v6WgFZVx1Bs4bFz59KA0pRn0qDVH2l0qnoHEJY4x8fekjXXU0uBIoKqIld-ES8OxCamBQc5pl_nwkAenIM4octnqUnyUkDkzbhUkrmPC0Ar1lJp9AX2OtRDI4OxLyprJY3Eg9yrMTAKd08vpWg8l3MnM-Aw5pGthvH-qJWHA8HU43A26iLVF136x0w3g-jA-zyTBBCOauWvzZi80LFH97nH0lgIYa8UaIf4nNWHjn9SdlVkmiiLoV2nFQltllsbSnRZZhuOGAbPiVROVMqsCVKbT83x9mvQYjQ3OywVZHUGqpFdqvB0LiT10096XTbLbsZi9SX0AGfYOtbCmyAsf8fPVEcfq01snqCvBYgoaGf_aboewgt5K70nWQOwjEriSFUxh6esHFxPuJjQvUycjQkvBQFoHVOmt9msjx_MRxp17qni2WO787U5m1v0crtBYK_xCLwsGwgD4psDFxBYlmc7te9_BafWCEZE991dEJddHeVxEbJ2PwQLREiWXA5EbtDYPGUTz-cOsmNK2-cQiDB0ay9uWtLSeAVUma2OHR5xUyIto-XP59hMs2vBxWuDvWMwCGlCbF_T6fkkJysEYQNcRimu_-8-F5FRDPwUkPwJXk-YGzpqoZfdTOfkvtg0MzY0yVoJgQG7kNyel9i6cKUbKa_CgxJuH_Ij6AEFXmg.RfM8wj2zhp-37IB6RP6TFw',
                    tokenServiceProvider: 'TOKEN_PROVIDER_VISA',
                    userAddress: {address1: 'Ohio Creek Road', address2: '', city: 'Gunnison', country: 'US', name: 'Michał', phone: '', postal_code: '81230', state: 'CO'},
                    httpCode: 200,
                    jsonCode: 200,
                    authResponseMessage: '200 OK',
                    requestID: '8d7a65c16c67dbdc-FRA',
                };
                handleFetchData('pushProvision', () =>
                    PushProvisioning.Google.pushProvision({
                        opc: expensifyCard.opaquePaymentCard,
                        tsp: 'VISA',
                        clientName: 'Expensify',
                        lastDigits: '8566',
                        address: {
                            name: expensifyCard.userAddress.name,
                            addressOne: expensifyCard.userAddress.address1,
                            addressTwo: expensifyCard.userAddress.address2,
                            locality: expensifyCard.userAddress.city,
                            administrativeArea: 'CO',
                            countryCode: expensifyCard.userAddress.country,
                            postalCode: expensifyCard.userAddress.postal_code,
                            phoneNumber: '(415)5550132',
                        },
                    }),
                );
            }}
        />
    </>
);

const App: React.FC = () => {
    const [log, setLog] = useState<string>('');

    const handleFetchData = async (methodName: string, method: () => Promise<any>) => {
        try {
            const result = await method();
            setLog((prevLog) => `${prevLog}\n${methodName}: ${JSON.stringify(result)}`);
        } catch (error: any) {
            setLog((prevLog) => `${prevLog}\n${methodName} Error: ${error.message}`);
        }
    };

    return (
        <SafeAreaView>
            <ScrollView>
                <Text>Test React Native Wallet</Text>

                {Platform.OS === 'ios' && <AppleMethods handleFetchData={handleFetchData} />}
                {Platform.OS === 'android' && <GoogleMethods handleFetchData={handleFetchData} />}

                <Text>Logs:</Text>
                <Text>{log}</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default App;
