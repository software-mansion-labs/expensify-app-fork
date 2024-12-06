package com.wallet

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap

abstract class WalletSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  abstract fun checkWalletAvailability(promise: Promise)
  abstract fun getSecureWalletInfo(promise: Promise)
  abstract fun getCardStatus(last4Digits: String, promise: Promise)
  abstract fun getCardTokenStatus(tsp: String, tokenRefId: String, promise: Promise)
  abstract fun addCardToWallet(data: ReadableMap, promise: Promise)
}
