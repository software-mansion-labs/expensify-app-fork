# `victory-native` patches

### [victory-native+41.20.2+001+add-lineExtent-prop-for-yAxis.patch](victory-native+41.20.2+001+add-lineExtent-prop-for-yAxis.patch)

- Reason: Adds `lineExtent` prop to YAxis configuration allowing grid lines to extend only to content edges (bar edges) instead of full domain. This matches Figma designs where Y-axis grid lines should not extend beyond the outermost bars. For single data point, automatically falls back to 'domain' mode for consistent line extent.
- Upstream PR/issue: N/A (custom feature for Expensify)
- E/App issue: N/A
- PR Introducing Patch: TBD
