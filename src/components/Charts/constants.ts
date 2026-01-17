import type {Color} from '@shopify/react-native-skia';
import type {RoundedCorners} from 'victory-native';
import colors from '@styles/theme/colors';

/**
 * Chart color palette from Figma design.
 * Colors cycle when there are more data points than colors.
 */
const CHART_COLORS: Color[] = [
    colors.yellow400,
    colors.tangerine400,
    colors.pink400,
    colors.green400,
    colors.ice400,
];

/** Number of Y-axis ticks (including zero) */
const Y_AXIS_TICK_COUNT = 5;

/** Inner padding between bars (0.3 = 30% of bar width) */
const BAR_INNER_PADDING = 0.3;

/** Domain padding configuration for the chart */
const DOMAIN_PADDING = {
    left: 0,
    right: 0,
    top: 30,
    bottom: 10,
};

/** Distance between Y-axis labels and the chart */
const Y_AXIS_LABEL_OFFSET = 16;

/** Rounded corners radius for bars */
const BAR_CORNER_RADIUS = 8;

/** Rounded corners configuration for bars */
const BAR_ROUNDED_CORNERS: RoundedCorners = {
    topLeft: BAR_CORNER_RADIUS,
    topRight: BAR_CORNER_RADIUS,
    bottomLeft: BAR_CORNER_RADIUS,
    bottomRight: BAR_CORNER_RADIUS,
};

/** Chart padding */
const CHART_PADDING = 5;

/** Default bar color index when useSingleColor is true (ice blue) */
const DEFAULT_SINGLE_BAR_COLOR_INDEX = 4;

/** Safety buffer multiplier for domain padding calculation */
const DOMAIN_PADDING_SAFETY_BUFFER = 1.1;

/** Expensify Neue font path for web builds */
const EXPENSIFY_NEUE_FONT_URL = '/fonts/ExpensifyNeue-Regular.woff';

/** Y-axis domain starting from zero */
const Y_AXIS_DOMAIN: [number] = [0];

/** Line width for X-axis (hidden) */
const X_AXIS_LINE_WIDTH = 0;

/** Line width for Y-axis grid lines */
const Y_AXIS_LINE_WIDTH = 1;

/** Line width for frame (hidden) */
const FRAME_LINE_WIDTH = 0;

export {
    CHART_COLORS,
    Y_AXIS_TICK_COUNT,
    BAR_INNER_PADDING,
    DOMAIN_PADDING,
    Y_AXIS_LABEL_OFFSET,
    BAR_ROUNDED_CORNERS,
    CHART_PADDING,
    DEFAULT_SINGLE_BAR_COLOR_INDEX,
    DOMAIN_PADDING_SAFETY_BUFFER,
    EXPENSIFY_NEUE_FONT_URL,
    Y_AXIS_DOMAIN,
    X_AXIS_LINE_WIDTH,
    Y_AXIS_LINE_WIDTH,
    FRAME_LINE_WIDTH,
};
