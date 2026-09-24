import Button from '@components/Button';
import Text from '@components/Text';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import BootSplash from '@libs/BootSplash';

import CONST from '@src/CONST';

import React, {Activity, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {View} from 'react-native';

/*
 * The smallest screen that shows the one thing a useScreenActivityEffect call site must not do: share a ref with a
 * plain useEffect. App.tsx renders this instead of the navigation root. Nothing here touches Onyx or navigation.
 */

const REPORT_ID = 'design';
const EVENT_INTERVAL_MS = 1500;

type Report = {name: string; unread: number};
type Subscription = {id: number; close: () => void};

/** Stands in for the Onyx report collection. Leaving a chat deletes its entry, as Onyx does. */
const reports: Record<string, Report> = {[REPORT_ID]: {name: 'Design team', unread: 0}};

/** Stands in for Pusher. A subscription is open while its id sits here; every open one gets an event on each tick. */
const openSubscriptions = new Map<number, () => void>();
let nextID = 1;

const log: string[] = [];

/** Everything above lives outside React, so every change publishes a fresh snapshot for the screen to render. */
let snapshot = {log: [] as string[], open: [] as number[], unread: 0, crash: null as Error | null};
const listeners = new Set<() => void>();

function publish(crash: Error | null = snapshot.crash) {
    snapshot = {log: [...log], open: [...openSubscriptions.keys()], unread: reports[REPORT_ID]?.unread ?? 0, crash};
    for (const listener of listeners) {
        listener();
    }
}

function subscribeStore(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return snapshot;
}

function note(line: string) {
    log.unshift(line);
    log.length = Math.min(log.length, 5);
    publish();
}

function subscribe(onEvent: () => void): Subscription {
    const id = nextID;
    nextID += 1;
    openSubscriptions.set(id, onEvent);
    publish();
    return {
        id,
        close: () => {
            openSubscriptions.delete(id);
            publish();
        },
    };
}

// Pusher delivers events on its own schedule. An uncaught error in an event callback is a hard crash on native and an
// unhandled exception on web. The demo catches it only to hand it to the app's ErrorBoundary, so it is visible here.
setInterval(() => {
    for (const onEvent of openSubscriptions.values()) {
        try {
            onEvent();
        } catch (error) {
            publish(error instanceof Error ? error : new Error(String(error)));
        }
    }
}, EVENT_INTERVAL_MS);

/** The event handler a chat would have: bump the unread count of its report. Correct as long as the report exists. */
function onNewMessage(reportID: string) {
    reports[reportID].unread += 1;
    note(`event: unread for ${reportID} is now ${reports[reportID].unread}`);
}

const STEPS_BROKEN = [
    '1. Cover: the screen goes under <Activity mode="hidden">. React runs the plain useEffect cleanup: subscriptionRef.current = null. The hook does nothing, the subscription stays open. Log: "useEffect cleanup: subscriptionRef.current = null".',
    '2. Leave chat: the report is deleted and the widget leaves the tree while hidden. Now the hook cleanup runs, reads the ref, finds null, skips close(). The subscription is open with no owner. Status turns red.',
    '3. Wait a second. Pusher delivers the next event to the leaked handler. It does reports["design"].unread += 1 on a report that no longer exists: TypeError. On native this is a crash. Here the app\'s ErrorBoundary shows it.',
    'Control: skip step 1 and click Leave chat on the uncovered screen. Both cleanups run in the same commit, hook first: close() succeeds, then the ref is nulled. This is why the code looks correct in every test that never covers the screen.',
];

const STEPS_FIXED = [
    '1. Cover: the screen goes under <Activity mode="hidden">. There is no plain useEffect, so nothing runs. The hook keeps the subscription open.',
    '2. Leave chat: the report is deleted and the widget leaves the tree while hidden. The hook cleanup runs and calls close() on the subscription from its own closure. Status stays green.',
    '3. Wait a second. No subscription is open, so no event is delivered. Nothing to crash.',
];

function WidgetBroken() {
    // The trap: one ref written by useScreenActivityEffect and cleared by a plain useEffect, the way an isMountedRef is.
    const subscriptionRef = useRef<Subscription | null>(null);

    useScreenActivityEffect(() => {
        const subscription = subscribe(() => onNewMessage(REPORT_ID));
        subscriptionRef.current = subscription;
        note(`hook setup: subscribed #${subscription.id}, stored in subscriptionRef`);
        return () => {
            const current = subscriptionRef.current;
            if (current) {
                current.close();
                note(`hook cleanup: closed #${current.id} via subscriptionRef`);
                return;
            }
            note('hook cleanup: subscriptionRef.current is null, close() skipped');
        };
    }, []);

    useEffect(() => {
        return () => {
            subscriptionRef.current = null;
            note('useEffect cleanup: subscriptionRef.current = null');
        };
    }, []);

    return <ChatBox label="broken" />;
}

function WidgetFixed() {
    useScreenActivityEffect(() => {
        const subscription = subscribe(() => onNewMessage(REPORT_ID));
        note(`hook setup: subscribed #${subscription.id}, held in the closure`);
        return () => {
            subscription.close();
            note(`hook cleanup: closed #${subscription.id} via the closure`);
        };
    }, []);

    return <ChatBox label="fixed" />;
}

function ChatBox({label}: {label: string}) {
    const {unread} = useSyncExternalStore(subscribeStore, getSnapshot);
    return (
        <Text>
            Design team chat ({label}), unread: {unread}
        </Text>
    );
}

function SharedCleanupDemo() {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {log: lines, open: openIDs, crash} = useSyncExternalStore(subscribeStore, getSnapshot);
    const [isFixed, setIsFixed] = useState(false);
    const [isCovered, setIsCovered] = useState(false);
    const [isMounted, setIsMounted] = useState(true);
    const Widget = isFixed ? WidgetFixed : WidgetBroken;
    const isLeaked = openIDs.length > 0 && !isMounted;

    useEffect(() => {
        BootSplash.hide();
    }, []);

    if (crash) {
        throw crash;
    }

    return (
        <View style={[styles.flex1, styles.p5, styles.gap4, {backgroundColor: theme.appBG}]}>
            <Text style={styles.textHeadlineH2}>useScreenActivityEffect: shared cleanup trap ({isFixed ? 'fixed' : 'broken'})</Text>

            <View style={styles.gap1}>
                <Text style={styles.textLabelSupporting}>SETUP</Text>
                <Text>
                    Screens wrapped in {'<Activity mode="hidden">'} (a chat covered by the RHP) keep their state, but React runs every plain useEffect cleanup on cover and the setup again on
                    reveal. useScreenActivityEffect is a useEffect whose cleanup skips the cover and runs only when the component is really removed. Below, one chat widget uses it to
                    subscribe to Pusher events for report &quot;design&quot;. The handler bumps the unread count of that report, which is correct as long as the report exists.
                </Text>
                {isFixed ? (
                    <Text>Fixed variant: the widget keeps the subscription in the closure of the effect and closes it from there. Nothing else touches it.</Text>
                ) : (
                    <Text>
                        Broken variant: the widget stores the subscription in a ref. Its useScreenActivityEffect cleanup closes whatever the ref points to. A plain useEffect next to it nulls
                        the ref in its cleanup, the way an isMountedRef is cleared. Two cleanups, one ref.
                    </Text>
                )}
            </View>

            <View style={[styles.flexRow, styles.gap2, styles.flexWrap]}>
                <Button onPress={() => setIsCovered((value) => !value)}>
                    <Button.Text>{isCovered ? '1. Uncover' : '1. Cover (open RHP)'}</Button.Text>
                </Button>
                <Button
                    variant={CONST.BUTTON_VARIANT.DANGER}
                    onPress={() => {
                        delete reports[REPORT_ID];
                        setIsMounted(false);
                        publish();
                    }}
                    isDisabled={!isMounted}
                >
                    <Button.Text>2. Leave chat (delete report, remove widget)</Button.Text>
                </Button>
                <Button
                    size={CONST.BUTTON_SIZE.SMALL}
                    onPress={() => {
                        openSubscriptions.clear();
                        nextID = 1;
                        reports[REPORT_ID] = {name: 'Design team', unread: 0};
                        log.length = 0;
                        publish(null);
                        setIsFixed((value) => !value);
                        setIsCovered(false);
                        setIsMounted(true);
                    }}
                >
                    <Button.Text>Switch to {isFixed ? 'broken' : 'fixed'}</Button.Text>
                </Button>
            </View>

            <Text style={[styles.textHeadlineH2, {color: isLeaked ? theme.danger : theme.success}]}>
                {openIDs.length === 0 ? 'subscription closed' : `subscription #${openIDs.join(', #')} OPEN`}
                {isLeaked ? ', nobody owns it, next event crashes' : ''}
            </Text>

            <View
                style={[
                    styles.p4,
                    styles.gap2,
                    {backgroundColor: theme.cardBG, borderColor: isCovered ? theme.border : theme.success, borderWidth: 2, borderStyle: isCovered ? 'dashed' : 'solid'},
                ]}
            >
                <Text style={styles.textLabelSupporting}>SCREEN {isCovered ? '(covered)' : '(visible)'}</Text>
                <Activity mode={isCovered ? 'hidden' : 'visible'}>{isMounted ? <Widget /> : <Text style={styles.textSupporting}>no chat, report deleted</Text>}</Activity>
            </View>

            <View style={styles.gap1}>
                <Text style={styles.textLabelSupporting}>LOG</Text>
                {lines.length === 0 ? <Text style={styles.textSupporting}>nothing yet</Text> : null}
                {lines.map((line) => (
                    <Text
                        key={line}
                        style={[styles.textMicroSupporting, line.includes('skipped') && {color: theme.danger}]}
                    >
                        {line}
                    </Text>
                ))}
            </View>

            <View style={styles.gap2}>
                <Text style={styles.textLabelSupporting}>WHAT EACH STEP DOES</Text>
                {(isFixed ? STEPS_FIXED : STEPS_BROKEN).map((line) => (
                    <Text key={line}>{line}</Text>
                ))}
                <Text style={[styles.textLabelSupporting, styles.mt2]}>THE RULE</Text>
                <Text>A useScreenActivityEffect cleanup touches only what its own setup created, through the closure: const s = subscribe(); return () =&gt; s.close().</Text>
                <Text>
                    No refs written or cleared from another effect, no module-level variables, no counters shared with a plain useEffect. Then the moment the cleanup runs stops mattering.
                </Text>
            </View>
        </View>
    );
}

export default SharedCleanupDemo;
