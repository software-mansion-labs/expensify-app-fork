# `victory-native` patches

### [victory-native+41.20.2+001+add-lineExtent-prop-for-yAxis.patch](victory-native+41.20.2+001+add-lineExtent-prop-for-yAxis.patch)

- Reason: Adds `lineExtent` prop to YAxis configuration allowing grid lines to extend only to content edges (bar edges) instead of full domain. This matches Figma designs where Y-axis grid lines should not extend beyond the outermost bars. For single data point, automatically falls back to 'domain' mode for consistent line extent.
- Upstream PR/issue: N/A (custom feature for Expensify)
- E/App issue: N/A
- PR Introducing Patch: TBD

### [victory-native+41.20.2+002+add-hover-state-support.patch](victory-native+41.20.2+002+add-hover-state-support.patch)

- Reason: Adds hover state support for CartesianChart (web only). Introduces `useChartHoverState` hook (similar to `useChartPressState`) and `Gesture.Hover()` handling in CartesianChart. The hover state tracks cursor position and matched data point index, enabling tooltips on bar chart hover. Also adds `cursor` property to track raw cursor coordinates for hit-testing.
- Upstream PR/issue: N/A (custom feature for Expensify)
- E/App issue: N/A
- PR Introducing Patch: TBD
