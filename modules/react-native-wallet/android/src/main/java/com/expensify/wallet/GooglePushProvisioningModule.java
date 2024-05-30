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
import com.google.android.gms.tapandpay.TapAndPay;
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;

public class GooglePushProvisioningModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private static final int REQUEST_CODE_PUSH_TOKENIZE = 3; // Arbitrary request code
    private Promise promise;

    public GooglePushProvisioningModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "GooglePushProvisioning";
    }

    @ReactMethod
    public void startPushProvision(String opc, String cardholderName, String lastFourDigits, Promise promise) {
        this.promise = promise;

        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist");
            return;
        }

        try {
            PushTokenizeRequest request = PushTokenizeRequest.builder()
                .setOpaquePaymentCard(opc)
                .build(); // You might add more parameters here if needed

                TapAndPay.getClient(reactContext)
                .pushTokenize(request)
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (task.isSuccessful()) {
                            String token = task.getResult();
                            promise.resolve(token); // Resolve with the obtained token
                        } else {
                            Exception exception = task.getException();
                            if (exception instanceof ApiException) {
                                ApiException apiException = (ApiException) exception;
                                // Handle specific API exceptions here (e.g., RESOLUTION_REQUIRED)
                                promise.reject("E_PUSH_TOKENIZE_API_EXCEPTION", "ApiException: " + apiException.getStatusCode()); 
                            } else {
                                promise.reject("E_PUSH_TOKENIZE_FAILED", exception != null ? exception.getMessage() : "Push tokenization failed");
                            }
                        }
                    }
                });

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