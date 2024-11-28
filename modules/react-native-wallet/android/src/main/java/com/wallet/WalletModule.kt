package com.wallet

import android.R
import android.app.Activity
import android.app.Activity.RESULT_OK
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.PromiseImpl
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.tapandpay.TapAndPay
import com.google.android.gms.tapandpay.TapAndPayClient
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest
import com.google.android.gms.tapandpay.issuer.TokenInfo
import com.wallet.Utils.getAsyncResult
import com.wallet.Utils.toCardData
import com.wallet.model.CardStatus
import com.wallet.model.WalletData
import kotlinx.coroutines.*
import org.json.JSONObject
import java.nio.charset.Charset
import java.util.Locale


class WalletModule internal constructor(context: ReactApplicationContext) : WalletSpec(context) {

  companion object {
    const val NAME = "Wallet"
    const val REQUEST_CODE_PUSH_TOKENIZE: Int = 3
    const val REQUEST_CREATE_WALLET: Int = 4
    const val TSP_VISA: String = "VISA"
    const val TSP_MASTERCARD: String = "MASTERCARD"
  }

  private var tapAndPayClient: TapAndPayClient? = null
  private var pendingCreateWalletPromise: Promise? = null
  private var pendingAddCardPromise: Promise? = null

  init {
    reactApplicationContext.addActivityEventListener(object : ActivityEventListener {
      override fun onActivityResult(
        activity: Activity?, requestCode: Int, resultCode: Int, intent: Intent?
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
  override fun getSecureWalletInfo(promise: Promise) {
    CoroutineScope(Dispatchers.Main).launch {
      try {
        val walletId = async { getWalletIdAsync() }
        val hardwareId = async { getHardwareIdAsync() }
        val walletData = WalletData(
          platform = "android", deviceID = hardwareId.await(), walletAccountID = walletId.await()
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
  override fun getCardStatus(last4Digits: String, promise: Promise) {
    if (!ensureTapAndPayClientInitialized()) {
      promise.reject("Initialization error", "TapAndPay client initialization failed")
      return
    }

    tapAndPayClient!!.listTokens()
      .addOnCompleteListener { task ->
        if (!task.isSuccessful || task.result == null) {
          promise.reject("error", "no tokens available")
          return@addOnCompleteListener
        }
        val token = task.result.find { it.fpanLastFour == last4Digits }
        token?.let {
          Log.wtf("LOG", "Card Token State: ${it.tokenState}")
          promise.resolve(it.tokenState)
        } ?: promise.reject("Error", "Didn't find proper token")
      }
      .addOnFailureListener { e -> promise.reject("getCardStatus function failed", e) }
      .addOnCanceledListener {
        promise.reject(
          "Reject",
          "Card status retrieval canceled"
        )
      }
  }



  @ReactMethod
  override fun addCardToWallet(
    data: ReadableMap, promise: Promise
  ) {
    if (!ensureTapAndPayClientInitialized()) return

    try {
      val cardData = data.toCardData() ?: return promise.reject("Reject: ", "Insufficient data")

      val cardNetwork: Int = when (cardData.network.uppercase(Locale.getDefault())) {
        TSP_MASTERCARD -> TapAndPay.CARD_NETWORK_MASTERCARD
        TSP_VISA -> TapAndPay.CARD_NETWORK_VISA
        else -> 1000
      }

      val tokenServiceProvider: Int = when (cardData.network.uppercase(Locale.getDefault())) {
        TSP_VISA -> TapAndPay.TOKEN_PROVIDER_MASTERCARD
        TSP_MASTERCARD -> TapAndPay.TOKEN_PROVIDER_VISA
        else -> 1000
      }

      val pushTokenizeRequest = PushTokenizeRequest.Builder()
        .setOpaquePaymentCard(cardData.opaquePaymentCard.toByteArray(Charset.forName("UTF-8")))
        .setNetwork(cardNetwork)
        .setTokenServiceProvider(tokenServiceProvider)
        .setDisplayName(cardData.cardHolderName)
        .setLastDigits(cardData.lastDigits)
        .setUserAddress(cardData.userAddress)
        .build()

      tapAndPayClient?.pushTokenize(
        currentActivity!!, pushTokenizeRequest, REQUEST_CODE_PUSH_TOKENIZE
      )
    } catch (e: java.lang.Exception) {
      promise.reject(e)
    }
  }

  private fun getWalletId(promise: Promise) {
    if (!ensureTapAndPayClientInitialized()) {
      promise.reject("Initialization error", "TapAndPay client initialization failed")
      return
    }
    tapAndPayClient?.activeWalletId?.addOnCompleteListener { task ->
      if (task.isSuccessful) {
        val walletId = task.result
        if (walletId != null) {
          promise.resolve(walletId)
        }
      }
    }?.addOnFailureListener { e ->
      promise.reject("Wallet id retrieval failed", e)
    }?.addOnCanceledListener {
      promise.reject(
        "Reject: ", "Wallet id retrieval canceled"
      )
    }
  }

  private fun getHardwareId(promise: Promise) {
    if (!ensureTapAndPayClientInitialized()) {
      promise.reject("Initialization error", "TapAndPay client initialization failed")
      return
    }
    tapAndPayClient?.stableHardwareId?.addOnCompleteListener { task ->
      if (task.isSuccessful) {
        val hardwareId = task.result
        promise.resolve(hardwareId)
      }
    }?.addOnFailureListener { e ->
      promise.reject("Stable hardware id retrieval failed", e)
    }?.addOnCanceledListener {
      promise.reject(
        "Reject: ", "Stable hardware id retrieval canceled"
      )
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

  override fun getName(): String {
    return NAME
  }

  private suspend fun getWalletIdAsync(): String = getAsyncResult(String::class.java) { promise ->
    getWalletId(promise)
  }

  private suspend fun getHardwareIdAsync(): String = getAsyncResult(String::class.java) { promise ->
    getHardwareId(promise)
  }
}
