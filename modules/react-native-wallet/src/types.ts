export type WalletData = AndroidWalletData | IOSWalletData;

export type AndroidWalletData = {
  platform: 'android';
  deviceID: string;
  walletAccountID: string;
};

type IOSWalletData = {
  platform: 'ios';
  nonce: string;
  nonceSignature: string;
  certificates: string;
};

export type UserAddress = {
  name: string;
  addressOne: string;
  addressTwo?: string;
  administrativeArea: string;
  countryCode: string;
  postalCode: string;
  phoneNumber: string;
};

export type AndroidCardData = {
  platform: 'android';
  network: string;
  opaquePaymentCard: string;
  cardHolderName: string;
  lastDigits: string;
  userAddress: UserAddress;
};
