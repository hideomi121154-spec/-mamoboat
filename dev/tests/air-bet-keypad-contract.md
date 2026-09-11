# AIR BET custom keypad regression contract

- Budget entry must not use a native text/number input.
- Tapping the budget display must not open the iOS keyboard or change visual viewport size.
- Digits, clear, backspace, +1,000B, +5,000B and +10,000B are handled by in-app buttons.
- Allocation still requires 100B units and keeps the existing equal-payout engine.
- Allocation CSS lives only in `air-bet-review-compact.css`; no runtime `<style>` injection.
- Existing AIR BET selection, navigation, pressroom and app.js logic remain untouched.
