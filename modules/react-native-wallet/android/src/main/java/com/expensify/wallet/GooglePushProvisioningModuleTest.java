package com.expensify.wallet;

import static org.mockito.Mockito.*;

import android.app.Activity;
import android.content.Intent;
import com.facebook.react.bridge.Promise;
import com.google.android.gms.tapandpay.TapAndPayClient;
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest;
import com.google.android.gms.tapandpay.issuer.TokenStatus;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.TaskCompletionSource;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

public class GooglePushProvisioningModuleTest {
    @Mock
    private TapAndPayClient tapAndPayClient;
    @Mock
    private Promise promise;
    @Mock
    private Activity activity;
    private GooglePushProvisioningModule module;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        ReactApplicationContext reactContext = mock(ReactApplicationContext.class);
        when(reactContext.getCurrentActivity()).thenReturn(activity);
        module = new GooglePushProvisioningModule(reactContext);
        module.tapAndPayClient = tapAndPayClient;
    }

    @Test
    public void testGetTokenStatusSuccess() {
        TaskCompletionSource<TokenStatus> taskSource = new TaskCompletionSource<>();
        TokenStatus tokenStatus = new TokenStatus();
        taskSource.setResult(tokenStatus);

        when(tapAndPayClient.getTokenStatus(anyInt(), anyString())).thenReturn(taskSource.getTask());

        module.getTokenStatus("VISA", "someTokenRefId", promise);

        verify(promise).resolve(any());
    }

    @Test
    public void testGetTokenStatusFailure() {
        TaskCompletionSource<TokenStatus> taskSource = new TaskCompletionSource<>();
        taskSource.setException(new Exception("Failed"));

        when(tapAndPayClient.getTokenStatus(anyInt(), anyString())).thenReturn(taskSource.getTask());

        module.getTokenStatus("VISA", "someTokenRefId", promise);

        verify(promise).reject(eq("GET_TOKEN_STATUS_ERROR"), anyString(), any(Exception.class));
    }

    @Test
    public void testPushProvisionSuccess() {
        TaskCompletionSource<Void> taskSource = new TaskCompletionSource<>();
        taskSource.setResult(null);

        when(tapAndPayClient.pushTokenize(any(PushTokenizeRequest.class))).thenReturn(taskSource.getTask());

        module.pushProvision("opc", "VISA", "clientName", "1234", "{}");

        // Simulate the result of the pushTokenize operation
        module.mActivityEventListener.onActivityResult(activity, GooglePushProvisioningModule.REQUEST_CODE_PUSH_TOKENIZE, Activity.RESULT_OK, null);

        verify(promise).resolve("Card successfully added to Google Pay");
    }

    @Test
    public void testPushProvisionFailure() {
        TaskCompletionSource<Void> taskSource = new TaskCompletionSource<>();
        taskSource.setException(new Exception("Provisioning failed"));

        when(tapAndPayClient.pushTokenize(any(PushTokenizeRequest.class))).thenReturn(taskSource.getTask());

        module.pushProvision("opc", "VISA", "clientName", "1234", "{}");

        // Simulate the result of the pushTokenize operation
        module.mActivityEventListener.onActivityResult(activity, GooglePushProvisioningModule.REQUEST_CODE_PUSH_TOKENIZE, Activity.RESULT_CANCELED, null);

        verify(promise).reject(eq("E_PUSH_TOKENIZE_CANCELED"), anyString());
    }

    @Test
    public void testGetActiveWalletIDSuccess() {
        TaskCompletionSource<String> taskSource = new TaskCompletionSource<>();
        taskSource.setResult("walletId");

        when(tapAndPayClient.getActiveWalletId()).thenReturn(taskSource.getTask());

        module.getActiveWalletID(promise);

        verify(promise).resolve("walletId");
    }

    @Test
    public void testGetActiveWalletIDFailure() {
        TaskCompletionSource<String> taskSource = new TaskCompletionSource<>();
        taskSource.setException(new Exception("Failed"));

        when(tapAndPayClient.getActiveWalletId()).thenReturn(taskSource.getTask());

        module.getActiveWalletID(promise);

        verify(promise).reject(eq("GET_ACTIVE_WALLET_ID_ERROR"), anyString(), any(Exception.class));
    }

    @Test
    public void testGetStableHardwareIdSuccess() {
        TaskCompletionSource<String> taskSource = new TaskCompletionSource<>();
        taskSource.setResult("hardwareId");

        when(tapAndPayClient.getStableHardwareId()).thenReturn(taskSource.getTask());

        module.getStableHardwareId(promise);

        verify(promise).resolve("hardwareId");
    }

    @Test
    public void testGetStableHardwareIdFailure() {
        TaskCompletionSource<String> taskSource = new TaskCompletionSource<>();
        taskSource.setException(new Exception("Failed"));

        when(tapAndPayClient.getStableHardwareId()).thenReturn(taskSource.getTask());

        module.getStableHardwareId(promise);

        verify(promise).reject(eq("GET_STABLE_HARDWARE_ID_ERROR"), anyString(), any(Exception.class));
    }

    @Test
    public void testGetEnvironmentSuccess() {
        TaskCompletionSource<String> taskSource = new TaskCompletionSource<>();
        taskSource.setResult("environment");

        when(tapAndPayClient.getEnvironment()).thenReturn(taskSource.getTask());

        module.getEnvironment(promise);

        verify(promise).resolve("environment");
    }

    @Test
    public void testGetEnvironmentFailure() {
        TaskCompletionSource<String> taskSource = new TaskCompletionSource<>();
        taskSource.setException(new Exception("Failed"));

        when(tapAndPayClient.getEnvironment()).thenReturn(taskSource.getTask());

        module.getEnvironment(promise);

        verify(promise).reject(eq("GET_ENVIRONMENT_ERROR"), anyString(), any(Exception.class));
    }
}
