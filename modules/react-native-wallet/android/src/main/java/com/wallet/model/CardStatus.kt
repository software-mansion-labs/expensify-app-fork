package com.wallet.model

enum class CardStatus(val code: Int, val message: String) {
  REQUIRE_IDENTITY_VERIFICATION(1, "Please activate your card."),
  PENDING(2, "Your card is pending."),
  ACTIVE(3, "Your card is ready to use."),
  SUSPENDED(4, "Your card has been suspended."),
  DEACTIVATED(5, "Your card is deactivated.");

  override fun toString(): String {
    return "$message (Code: $code)"
  }
}
