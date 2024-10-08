import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type {SharedFileData} from '@src/types/onyx/ShareFile';

function setShareFileReceiver(receiver: Report) {
    Onyx.set(ONYXKEYS.SHARE_FILE, {receiver});
}

function setShareFileData(fileData: SharedFileData) {
    console.log('SHARE FILE DATA ', fileData.content);
    Onyx.set(ONYXKEYS.SHARE_FILE, {fileData});
}

function clearShareFileToData() {
    Onyx.set(ONYXKEYS.SHARE_FILE, null);
}

export {setShareFileData, clearShareFileToData, setShareFileReceiver};
