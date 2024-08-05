package com.expensify.wallet;

import static org.mockito.Mockito.*;

import android.app.Activity;
import com.facebook.react.bridge.Promise;
import com.google.android.gms.tapandpay.TapAndPayClient;
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest;
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
    private GooglePushProvisioningModule module;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        module = new GooglePushProvisioningModule(null);
        module.tapAndPayClient = tapAndPayClient; // Inject mock client
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
        PushTokenizeRequest request = new PushTokenizeRequest.Builder().build();
        TaskCompletionSource<Void> taskSource = new TaskCompletionSource<>();
        taskSource.setResult(null);

        when(tapAndPayClient.pushTokenize(any(PushTokenizeRequest.class))).thenReturn(taskSource.getTask());

        module.pushProvision("VISA", "someTokenRefId", "active", promise);

        verify(promise).resolve("Token provisioning successful");
    }

    @Test
    public void testPushProvisionFailure() {
        PushTokenizeRequest request = new PushTokenizeRequest.Builder().build();
        TaskCompletionSource<Void> taskSource = new TaskCompletionSource<>();
        taskSource.setException(new Exception("Provisioning failed"));

        when(tapAndPayClient.pushTokenize(any(PushTokenizeRequest.class))).thenReturn(taskSource.getTask());

        module.pushProvision("VISA", "someTokenRefId", "active", promise);

        verify(promise).reject(eq("PUSH_PROVISION_ERROR"), anyString(), any(Exception.class));
    }
}
