Purpose
This sample app demonstrates how to use the react-native-wallet library to integrate Apple Pay for push provisioning of virtual cards. The library fetches necessary parameters and calls native methods for adding a card to the wallet.

Setup
Clone this repository: ``` git clone https://github.com/your-org/react-native-wallet.git ```
Open the project in Xcode: ``` cd react-native-wallet/example/ios open YourProject.xcworkspace ```
Set up the backend, perhaps by remixing the sample Glitch project
Request access
In the BuildSettings.xcconfig, configure the following to match your backend:
SAMPLE_PP_BACKEND_URL
See remixing the sample Glitch project for what these values should be if you use the provided sample backend.
Deploy the iOS App
The app must:
be registered with your Apple Developer account on App Store Connect
include the com.apple.developer.payment-pass-provisioning entitlement (see YourProject.entitlements)
The only way to test the end-to-end push provisioning flow is by distributing your app to real devices with TestFlight or the App Store.
Remix the Sample Backend on Glitch
We provide a sample backend hosted on Glitch, allowing you to easily test an integration end-to-end.

Open the Glitch project.
Click on "Remix", on the top right.
In your newly remixed Glitch project, open the .env file in the left sidebar.
Set your backend secret key as the SECRET_KEY field in .env.
Set your cardholder ID as the CARDHOLDER_ID field in .env.
Set the USERNAME and PASSWORD fields to values of your choice in .env.
Set the same values for SAMPLE_PP_BACKEND_USERNAME and SAMPLE_PP_BACKEND_PASSWORD in the BuildSettings.xcconfig.
Your backend implementation should now be running. You can see the logs by clicking on "Logs" in the bottom bar.
In Glitch, click "Share" then copy the "Live site" URL to use as the value for SAMPLE_PP_BACKEND_URL in the BuildSettings.xcconfig.
Example Usage
``` import PushProvisioning from '@your-org/push-provisioning';

PushProvisioning.Apple.canAddPaymentPass().then(canAdd => { console.log('Can Add Payment Pass:', canAdd); }).catch(error => { console.error('Error checking if payment pass can be added:', error); }); ```

Relevant documentation
PKAddPaymentPassViewController reference