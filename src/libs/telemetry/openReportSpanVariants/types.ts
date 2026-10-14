import type {GestureResponderEvent} from 'react-native';

type OpenReportInputEvent = GestureResponderEvent | KeyboardEvent | undefined;

type StartOpenReportSpanVariants = (reportID: string, event: OpenReportInputEvent, shouldWaitForHighlight: boolean) => void;

/** Receives the host node of the probe mounted with the report list; on web it is the DOM element. */
type AttachOpenReportList = (reportID: string, probeNode: unknown) => void;

type MarkOpenReport = (reportID: string) => void;

export type {AttachOpenReportList, MarkOpenReport, OpenReportInputEvent, StartOpenReportSpanVariants};
