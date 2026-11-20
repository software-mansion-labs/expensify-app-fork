/**
 * Runs one option action at a time. An action saves the draft and then navigates, so a second tap while it runs would
 * open the flow twice. The running action also tells its row to show a spinner.
 */
import {useRef, useState} from 'react';

type ExclusiveAction<TActionID extends string> = {
    /** The action that is running, if any */
    runningActionID: TActionID | undefined;

    /** Starts the action unless another one is running */
    runAction: (actionID: TActionID, action: () => Promise<void>) => void;
};

function useExclusiveAction<TActionID extends string>(): ExclusiveAction<TActionID> {
    const [runningActionID, setRunningActionID] = useState<TActionID | undefined>();

    // Two taps can land before the state of the first one renders, so the guard does not wait for the render
    const isRunningRef = useRef(false);

    const runAction = (actionID: TActionID, action: () => Promise<void>) => {
        if (isRunningRef.current) {
            return;
        }
        isRunningRef.current = true;
        setRunningActionID(actionID);
        action().finally(() => {
            isRunningRef.current = false;
            setRunningActionID(undefined);
        });
    };

    return {runningActionID, runAction};
}

export default useExclusiveAction;
