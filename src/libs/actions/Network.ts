import Onyx from 'react-native-onyx';
import Log from '@libs/Log';
import type {NetworkStatus} from '@libs/NetworkConnection';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ConnectionChanges} from '@src/types/onyx/Network';

function setNetworkLastOffline(lastOfflineAt: string) {
    void Onyx.merge(ONYXKEYS.NETWORK, {lastOfflineAt});
}

function setIsOffline(isNetworkOffline: boolean, reason = '') {
    if (reason) {
        let textToLog = '[Network] Client is';
        textToLog += isNetworkOffline ? ' entering offline mode' : ' back online';
        textToLog += ` because: ${reason}`;
        Log.info(textToLog);
    }
    void Onyx.merge(ONYXKEYS.NETWORK, {isOffline: isNetworkOffline});
}

function setNetWorkStatus(status: NetworkStatus) {
    void Onyx.merge(ONYXKEYS.NETWORK, {networkStatus: status});
}

function setTimeSkew(skew: number) {
    void Onyx.merge(ONYXKEYS.NETWORK, {timeSkew: skew});
}

function setShouldForceOffline(shouldForceOffline: boolean) {
    void Onyx.merge(ONYXKEYS.NETWORK, {shouldForceOffline});
}

/**
 * Test tool that will fail all network requests when enabled
 */
function setShouldFailAllRequests(shouldFailAllRequests: boolean) {
    void Onyx.merge(ONYXKEYS.NETWORK, {shouldFailAllRequests});
}

function setPoorConnectionTimeoutID(poorConnectionTimeoutID: NodeJS.Timeout | undefined) {
    void Onyx.merge(ONYXKEYS.NETWORK, {poorConnectionTimeoutID});
}

function setShouldSimulatePoorConnection(shouldSimulatePoorConnection: boolean, poorConnectionTimeoutID: NodeJS.Timeout | undefined) {
    if (!shouldSimulatePoorConnection) {
        clearTimeout(poorConnectionTimeoutID);
        void Onyx.merge(ONYXKEYS.NETWORK, {shouldSimulatePoorConnection, poorConnectionTimeoutID: undefined});
        return;
    }
    void Onyx.merge(ONYXKEYS.NETWORK, {shouldSimulatePoorConnection});
}

function setConnectionChanges(connectionChanges: ConnectionChanges) {
    void Onyx.merge(ONYXKEYS.NETWORK, {connectionChanges});
}

export {
    setIsOffline,
    setShouldForceOffline,
    setConnectionChanges,
    setShouldSimulatePoorConnection,
    setPoorConnectionTimeoutID,
    setShouldFailAllRequests,
    setTimeSkew,
    setNetWorkStatus,
    setNetworkLastOffline,
};
