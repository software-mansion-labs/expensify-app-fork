const Wallet = require('./NativeWallet').default;

export function multiply(a: number, b: number): number {
  return Wallet.multiply(a, b);
}
