import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {UserLocation} from '@src/types/onyx';

/**
 * Sets the longitude and latitude of user's current location
 */
function setUserLocation({longitude, latitude}: UserLocation) {
    void Onyx.set(ONYXKEYS.USER_LOCATION, {longitude, latitude});
}

function clearUserLocation() {
    void Onyx.set(ONYXKEYS.USER_LOCATION, null);
}

export {setUserLocation, clearUserLocation};
