package com.wallet

import android.app.Activity
import android.app.Activity.RESULT_OK
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.tapandpay.TapAndPay
import com.google.android.gms.tapandpay.TapAndPayClient
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest
import com.google.android.gms.tapandpay.issuer.UserAddress
import com.wallet.model.WalletData
import kotlinx.coroutines.*
import org.json.JSONObject
import java.nio.charset.Charset
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException


class WalletModule internal constructor(context: ReactApplicationContext) :
  WalletSpec(context) {
  private var tapAndPayClient: TapAndPayClient? = null
  private var pendingCreateWalletPromise: Promise? = null
  private var pendingAddCardPromise: Promise? = null

  private val REQUEST_CODE_PUSH_TOKENIZE: Int = 3
  private val REQUEST_CREATE_WALLET: Int = 4
  private val TSP_VISA: String = "VISA"
  private val TSP_MASTERCARD: String = "MASTERCARD"

  init {
    reactApplicationContext.addActivityEventListener(object : ActivityEventListener {
      override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        intent: Intent?
      ) {
        if (requestCode == REQUEST_CREATE_WALLET) {
          pendingCreateWalletPromise?.let {
            if (resultCode == RESULT_OK) {
              it.resolve(true);
              return
            }
            it.resolve(false);
          }
          pendingCreateWalletPromise = null
        } else if (requestCode == REQUEST_CODE_PUSH_TOKENIZE) {
          pendingAddCardPromise?.let {
            if (resultCode == RESULT_OK) {
              it.resolve(true);
              return
            }
            it.resolve(false);
          }
          pendingAddCardPromise = null
        }
        return
      }

      override fun onNewIntent(p0: Intent?) {}
    })
  }

  override fun getName(): String {
    return NAME
  }


  @ReactMethod
  override fun checkWalletAvailability(promise: Promise) {
    val localPromise = PromiseImpl({ _ ->
      promise.resolve(true)
    }, { e ->
      pendingCreateWalletPromise = promise
      tapAndPayClient!!.createWallet(currentActivity!!, REQUEST_CREATE_WALLET)
    })
    getWalletId(localPromise)
  }

  @ReactMethod
  override fun getWalletId(promise: Promise) {
    if (!ensureTapAndPayClientInitialized()) {
      return
    }
    tapAndPayClient
      ?.activeWalletId
      ?.addOnCompleteListener { task ->
        if (task.isSuccessful) {
          val walletId = task.result
          if (walletId != null) {
            promise.resolve(walletId)
          }
        }
      }
      ?.addOnFailureListener { e ->
        promise.reject(e)
      }
      ?.addOnCanceledListener {
        promise.reject(
          "REJECT",
          "Stable hardware ID retrieval canceled"
        )
      }
  }

  @ReactMethod
  override fun getHardwareId(promise: Promise) {
    if (!ensureTapAndPayClientInitialized()) {
      return
    }
    tapAndPayClient
      ?.stableHardwareId
      ?.addOnCompleteListener { task ->
        if (task.isSuccessful) {
          val hardwareId = task.result
          promise.resolve(hardwareId)
        } else {
          // Unknown failure, warn user we failed.
          promise.reject("REJECT", "DIDN'T GET HARDWARE ID")
        }
      }
  }

  private fun ensureTapAndPayClientInitialized(): Boolean {
    if (tapAndPayClient == null && currentActivity != null) {
      tapAndPayClient = TapAndPay.getClient(currentActivity!!)
    }
    if (tapAndPayClient == null) {
      return false
    }
    return true
  }

  @ReactMethod
  override fun getSecureWalletInfo(promise: Promise) {
    CoroutineScope(Dispatchers.Main).launch {
      try {
        val walletId = async { getWalletIdAsync() }
        val hardwareId = async { getHardwareIdAsync() }
        val walletData = WalletData(
          platform = "android",
          deviceID = hardwareId.await(),
          walletAccountID = walletId.await()
        )

        val walletDataJson = JSONObject().apply {
          put("platform", walletData.platform)
          put("deviceID", walletData.deviceID)
          put("walletAccountID", walletData.walletAccountID)
        }

        promise.resolve(walletDataJson.toString())
      } catch (e: Exception) {
        promise.reject("Error", "Failed to retrieve IDs: ${e.localizedMessage}")
      }
    }
  }

  @ReactMethod
  override fun addCardToWallet(
    cardData: ReadableMap,
    promise: Promise
  ) {
    if (!ensureTapAndPayClientInitialized()) return

    try {
      val network = cardData.getString("network") ?: ""
      val opaquePaymentCard = cardData.getString("opaquePaymentCard") ?: ""
      val cardHolderName = cardData.getString("cardHolderName") ?: ""
      val lastDigits = cardData.getString("lastDigits") ?: ""
      val addressMap = cardData.getMap("userAddress") ?: return promise.reject("ERROR", "User address is missing")

      val userAddress = UserAddress.newBuilder()
        .setName(addressMap.getString("name") ?: "")
        .setAddress1(addressMap.getString("addressOne") ?: "")
        .setAddress2(addressMap.getString("addressTwo") ?: "")
        .setLocality(addressMap.getString("city") ?: "")
        .setAdministrativeArea(addressMap.getString("administrativeArea") ?: "")
        .setCountryCode(addressMap.getString("countryCode") ?: "")
        .setPostalCode(addressMap.getString("postalCode") ?: "")
        .setPhoneNumber(addressMap.getString("phoneNumber") ?: "")
        .build()

      val cardNetwork: Int = when (network.uppercase(Locale.getDefault())) {
        TSP_MASTERCARD -> TapAndPay.CARD_NETWORK_MASTERCARD
        TSP_VISA -> TapAndPay.CARD_NETWORK_VISA
        else -> 1000
      }

      val tokenServiceProvider: Int = when (network.uppercase(Locale.getDefault())) {
        TSP_VISA -> TapAndPay.TOKEN_PROVIDER_MASTERCARD
        TSP_MASTERCARD -> TapAndPay.TOKEN_PROVIDER_VISA
        else -> 1000
      }


      val pushTokenizeRequest = PushTokenizeRequest.Builder()
        .setOpaquePaymentCard(opaquePaymentCard.toByteArray(Charset.forName("UTF-8")))
        .setNetwork(cardNetwork)
        .setTokenServiceProvider(tokenServiceProvider)
        .setDisplayName(cardHolderName)
        .setLastDigits(lastDigits)
        .setUserAddress(userAddress)
        .build()

      tapAndPayClient?.pushTokenize(
        currentActivity!!,
        pushTokenizeRequest,
        REQUEST_CODE_PUSH_TOKENIZE
      )
    } catch (e: java.lang.Exception) {
      promise.reject(e)
    }
  }

  private suspend fun getWalletIdAsync(): String = getAsyncResult(String::class.java) { promise ->
    getWalletId(promise)
  }

  private suspend fun getHardwareIdAsync(): String = getAsyncResult(String::class.java) { promise ->
    getHardwareId(promise)
  }

  private suspend fun getAsyncResult(
    resultType: Class<String>,
    getPromiseOperation: (Promise) -> Unit
  ): String = withContext(Dispatchers.IO) {
    suspendCancellableCoroutine { continuation ->
      val promise = object : Promise {
        override fun resolve(result: Any?) {
          if (resultType.isInstance(result)) {
            continuation.resume(result as String)
          } else {
            continuation.resumeWithException(
              RuntimeException("Expected result of type ${resultType.simpleName}, but got ${result?.javaClass?.simpleName}")
            )
          }
        }

        override fun reject(code: String?, message: String?) {
          continuation.resumeWithException(
            RuntimeException(message ?: "Unknown error during async operation")
          )
        }

        override fun reject(p0: String?, p1: Throwable?) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: String?, p1: String?, p2: Throwable?) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: Throwable?) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: Throwable?, p1: WritableMap?) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: String?, p1: WritableMap) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: String?, p1: Throwable?, p2: WritableMap?) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: String?, p1: String?, p2: WritableMap) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: String?, p1: String?, p2: Throwable?, p3: WritableMap?) {
          TODO("Not yet implemented")
        }

        override fun reject(p0: String?) {
          TODO("Not yet implemented")
        }

      }
      getPromiseOperation(promise)
    }
  }

  companion object {
    const val NAME = "Wallet"
  }
}
