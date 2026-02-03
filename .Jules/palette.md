## 2025-05-27 - Icon-only buttons lack ARIA labels
**Learning:** The app relies heavily on `material-symbols-outlined` for buttons (add, remove, backspace) without accompanying text, making them inaccessible to screen readers.
**Action:** Always wrap icon-only buttons with `aria-label` using the `t` function for internationalization.
