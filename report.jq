(
  [.groups | sort_by(-.count) | .[0:10] | .[].count] | add
) as $top10 |
(
  [.groups[].count] | add
) as $total |
{
  summary: {
    totalEffectiveUsages,
    directUsages,
    expandedFromWrappers,
    totalGroups
  },

  distribution: [
    [.groups[] | {
      bucket: (
        if .count >= 10 then "10+"
        elif .count >= 4 then "4-10"
        elif .count >= 2 then "2-3"
        else "1 (unique)"
        end
      ),
      count
    }]
    | group_by(.bucket)
    | .[]
    | {
        bucket: .[0].bucket,
        groups: length,
        totalUsages: ([.[].count] | add)
      }
  ] | sort_by(-.totalUsages),

  coverageTop10: {
    top10usages: $top10,
    total: $total,
    percentCoveredByTop10: (($top10 / $total) * 1000 | round / 10)
  },

  topGroups: [
    .groups
    | sort_by(-.count)
    | .[0:20][]
    | {
        rank: .groupId,
        count,
        visualSignature,
        directCount: ([.files[] | select(.source == "direct")] | length),
        wrapperCount: ([.files[] | select(.source != "direct")] | length),
        wrapperSources: [
          [.files[] | select(.source != "direct") | .source]
          | group_by(.)
          | .[]
          | {wrapper: .[0], count: length}
        ] | sort_by(-.count),
        sampleFiles: [.files[:5][] | "\(.file):\(.line)\(if .source != "direct" then "  (\(.source))" else "" end)"]
      }
  ],

  uniqueConfigs: [
    .groups[]
    | select(.count == 1)
    | {
        visualSignature,
        file: .files[0].file,
        line: .files[0].line,
        source: .files[0].source
      }
  ],

  wrapperImpact: [
    [.groups[].files[] | select(.source != "direct") | .source]
    | group_by(.)
    | .[]
    | {wrapper: .[0], expandedUsages: length}
  ] | sort_by(-.expandedUsages)
}
