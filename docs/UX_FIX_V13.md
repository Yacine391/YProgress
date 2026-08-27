# YProgress V13 — UX fixes

## Fix 1: Scroll position
Previous screen functions were declared inside `App`, creating a new React component identity on every state update. That could remount ScrollViews and send the user back to the top.

V13 renders each screen as a stable render function returning the host ScrollView directly, so state changes inside the same tab no longer depend on a recreated component type.

## Fix 2: Contrast
Text and muted text colors were lightened across cards, labels, inputs and navigation.
Secondary buttons now have a visible border.
Inputs now use higher-contrast backgrounds and borders.
