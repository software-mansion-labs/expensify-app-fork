package com.expensify.wallet;

import android.app.Activity;
import android.content.Intent;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;
import org.json.JSONObject;
import com.google.android.gms.tapandpay.TapAndPay;
import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_NO_ACTIVE_WALLET;
import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_TOKEN_NOT_FOUND;
import com.google.android.gms.tapandpay.TapAndPayClient;
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest;
import com.google.android.gms.tapandpay.issuer.TokenStatus;
import com.google.android.gms.tapandpay.issuer.UserAddress;
import java.nio.charset.Charset;

import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;

public class GooglePushProvisioningModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private static final int REQUEST_CODE_PUSH_TOKENIZE = 3; // Arbitrary request code
    private Promise promise;

    public GooglePushProvisioningModule(ReactApplicationContext ctx) {
        super(ctx);
        this.reactContext = ctx;
        ctx.addActivityEventListener(mActivityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "GooglePushProvisioning";
    }

    @ReactMethod
    public void startPushProvision(String opc, String tsp, String clientName, String lastDigits, JSONObject address,  Promise promise) {
        this.promise = promise;

        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist");
            return;
        }

        try {
          
            TapAndPayClient tapAndPayClient = TapAndPay.getClient(currentActivity);
            int cardNetwork = (tsp.equals("VISA")) ? TapAndPay.CARD_NETWORK_VISA : TapAndPay.CARD_NETWORK_MASTERCARD;
            int tokenServiceProvider = (tsp.equals("VISA")) ? TapAndPay.TOKEN_PROVIDER_VISA : TapAndPay.TOKEN_PROVIDER_MASTERCARD;
              
            UserAddress userAddress =
                    UserAddress.newBuilder()
                            .setName(address.getString("name"))
                            .setAddress1(address.getString("address"))
                            .setLocality(address.getString("locality"))
                            .setAdministrativeArea(address.getString("administrativeArea"))
                            .setCountryCode(address.getString("countryCode"))
                            .setPostalCode(address.getString("postalCode"))
                            .setPhoneNumber(address.getString("phoneNumber"))
                            .build();

            PushTokenizeRequest request = new PushTokenizeRequest.Builder()
            .setOpaquePaymentCard(opc.getBytes(Charset.forName("UTF-8")))
                            .setNetwork(cardNetwork)
                            .setTokenServiceProvider(tokenServiceProvider)
                            .setDisplayName(clientName)
                            .setLastDigits(lastDigits)
                            .setUserAddress(userAddress)
                            .build();

            tapAndPayClient.pushTokenize(currentActivity,request,REQUEST_CODE_PUSH_TOKENIZE);
          

        } catch (Exception e) {
            promise.reject("E_PUSH_TOKENIZE_ERROR", e.getMessage());
        }
    }
        
    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            super.onActivityResult(activity, requestCode, resultCode, data);
            if (requestCode == REQUEST_CODE_PUSH_TOKENIZE && promise != null) {
                if (resultCode == Activity.RESULT_OK) {
                    // The user successfully added the card to Google Pay.
                    promise.resolve("Card successfully added to Google Pay"); 
                } else if (resultCode == Activity.RESULT_CANCELED) {
                    // The user canceled the operation.
                    promise.reject("E_PUSH_TOKENIZE_CANCELED", "User canceled the operation");
                } else {
                    // Handle other result codes or errors here.
                    promise.reject("E_PUSH_TOKENIZE_FAILED", "Push tokenization failed with result code: " + resultCode);
                }
            }
        }
    };
}
