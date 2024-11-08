import {Platform, View} from 'react-native';
import PushProvisioning from 'react-native-wallet';
import Button from '@components/Button';

function TestWallet() {
    const handleOnPress = () => {
        console.log('Test Wallet');
        const expensifyCard = {
            cardToken: '14779334-0-V',
            displayName: 'Visa Card',
            lastDigits: '8566',
            network: 'Visa',
            opaquePaymentCard:
                'eyJraWQiOiJVN1o3Rk9FOUhEUVgyTlJWOFM1VDIxSk5TN1hFNkRybTVIVVJxZktqWF9LdmV2dDRzIiwidHlwIjoiSk9TRSIsImNoYW5uZWxTZWN1cml0eUNvbnRleHQiOiJTSEFSRURfU0VDUkVUIiwiZW5jIjoiQTI1NkdDTSIsInRhZyI6InM4NUJwWEJtWG43YjQycU1wbjhvc2ciLCJpYXQiOjE3Mjk4NTI4MTEsImFsZyI6IkEyNTZHQ01LVyIsIml2IjoiRnZlcDVxVGpZc0x4dVNkeiJ9.XDzif6cNllCNMrq4fX9LfdlA1YTBoghnTDALoWouEa8.3tRbLskgm-a2Ke5i.3okhHTFZF11jPwt5tUX3Ls7hgYBCXEnAWWomekhW_47XniZzY45D-z_0T4RPE1T26Q7NXgs7tVFm0ap8B014sdYfxF_CJugbzpq46hemHJP8uT3dOeW-nqqPl0O3faKQtlqbrZHLaXrloyyC_rQv0Jgj5s263pluL7W-rG1DdLNOznMbOejGUPAau8XGgh3E6w2PY-cQqoiYSIxPYrAmAi14azYRsCr6TiDsClZmG85PElkBxHINHzP0LHCTwH8QNJCc8nusUn-amaZKbFwiQ_obnwnAQwSZ2dAKnTprq9c8KqyoMQDvoQhPmR96E5te7LltJ6QcgJD_0HjmcpTHMNTpBMkmyzGagRnxvTE8bH5PcAK_YHLE-LHAHGvw96Ez2pUXpzgyG6IEhuLxl8xmhlmQF-3-sgmSmEPPIO7yO1j_GxgGJ2glMyCuL3Mj8TMJG_b8PCx3XKi2uWU-ZbfDTftkbgfYzirkpLPiWu7AOwC1cZ4MMtajpAVz4eUBHVT45Z6xaN3_qog40pOoyxSqwcTBq2-ePNE3LGp8DkC3JSgFf4bf-2I4AsAh1pSDc9HqqIIvhq6gCwH2AVpGt62WZrCimuyYkm8hhmdcBDmfiDZVXBzbw7WsSjcg4ShKJEfSAauJftc8YgkJd6qHj1zKrkWOJJiyZCR95pA3medS-VXTxoq_03MSC_ufr6F_atDnyyzAazIVzARitDayqqoWVY6LZIEUkhFTn0luIepue20jAQ4Vsg.Aw4tawDDzG2xGDClwLbgpQ',
            tokenServiceProvider: 'TOKEN_PROVIDER_VISA',
            userAddress: {address1: 'Ohio Creek Road', address2: '', city: 'Gunnison', country: 'US', name: 'Michał', phone: '', postal_code: '81230', state: 'CO'},
            httpCode: 200,
            jsonCode: 200,
            authResponseMessage: '200 OK',
            requestID: '8d7a65c16c67dbdc-FRA',
        };

        PushProvisioning.Apple.canAddPaymentPass().then((result) => {
            console.log('canAddPaymentPass', result);
        });

        PushProvisioning.Apple.startAddPaymentPass({
            last4: '1234',
            cardHolderName: 'John Doe',
        });
        console.log('XD');
    };

    return (
        <View style={{padding: 20}}>
            <Button
                text="Test"
                onPress={handleOnPress}
            />
        </View>
    );
}

export default TestWallet;
