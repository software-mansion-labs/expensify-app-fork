Purpose
This sample app demonstrates how to use the react-native-wallet library to integrate Google Pay for push provisioning of virtual cards. The library fetches necessary parameters and calls native methods for adding a card to the wallet.

Setup
Clone this repository: ``` git clone https://github.com/your-org/react-native-wallet.git ```
Open the project in Android Studio: ``` cd react-native-wallet/example/android ```
Set up the backend, perhaps by remixing the sample Glitch project
Request access
Download Google's private SDK
Unarchive it to the ./tapandpay_sdk/ directory, so you will have a directory structure like ./tapandpay_sdk/com/google/android/gms/... from the root of the Gradle project.
In the gradle.properties, configure the following to match your backend:
SAMPLE_PP_BACKEND_URL
If SAMPLE_PP_BACKEND_URL doesn't start with https://, you'll likely need to set SAMPLE_PP_BACKEND_USES_CLEAR_TEXT_TRAFFIC to true to configure your app to allow cleartext traffic, but please be careful about doing this for production builds.
Open the Gradle project inside Android Studio and let the Gradle sync complete.
Deploy the Android App
The app must be signed with a certificate that was added to an allowlist by Google.
Changes to the signing configuration may require a Gradle sync and uninstall + reinstall of the app.
All testing must be done in live mode, with live virtual cards, and on physical devices (not emulators).
Remix the Sample Backend on Glitch
We provide a sample backend hosted on Glitch, allowing you to easily test an integration end-to-end.

Open the Glitch project.
Click on "Remix", on the top right.
In your newly remixed Glitch project, open the .env file in the left sidebar.
Set your backend secret key as the SECRET_KEY field in .env.
Set your cardholder ID as the CARDHOLDER_ID field in .env.
Set the USERNAME and PASSWORD fields to values of your choice in .env.
Set the same values for SAMPLE_PP_BACKEND_USERNAME and SAMPLE_PP_BACKEND_PASSWORD in the gradle.properties.
Your backend implementation should now be running. You can see the logs by clicking on "Logs" in the bottom bar.
In Glitch, click "Share" then copy the "Live site" URL to use as the value for SAMPLE_PP_BACKEND_URL in the gradle.properties.
Example Usage
``` import PushProvisioning from '@your-org/push-provisioning';

PushProvisioning.Google.getActiveWalletID().then(walletID => { console.log('Active Wallet ID:', walletID); }).catch(error => { console.error('Error getting active wallet ID:', error); }); ```

Relevant documentation
Google Pay Push Provisioning API