["Rank", "Visual Signature", "Count", "Direct", "Wrapper"],
["---", "---", "---", "---", "---"],
(.groups | sort_by(-.count) | to_entries[] | [
  (.key + 1),
  (.value.visualSignature | gsub("\\|"; "·")),
  .value.count,
  ([.value.files[] | select(.source == "direct")] | length),
  ((.value.count) - ([.value.files[] | select(.source == "direct")] | length))
] | map(tostring))
| join(" | ")
