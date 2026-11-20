import {isConnected, isVerifying} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** The last request went through: the server reviews the setup or already opened the account */
function isOnboardingSent(achData: ACHData | undefined): boolean {
    return isVerifying(achData) || isConnected(achData, true);
}

export default isOnboardingSent;
