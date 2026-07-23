# Data Matters v3.5 Mobile Result Hotfix

## Problem confirmed
The previous v3.4 package forced the result artwork visible, but still depended on reordering two large desktop grid children. Old or conflicting mobile CSS could therefore leave the image outside the intended reading order, allow the description to overflow, and keep the two CTAs cramped side by side.

## Structural fix
The result Hero is now rendered as three explicit blocks:

1. `result-hero-heading`
2. `result-hero-art`
3. `result-hero-body`

Desktop uses named grid areas with artwork on the right. Mobile uses a deterministic one-column order:

`heading → artwork → description/reasons/actions`

This no longer relies on flex `order` overrides.

## Mobile artwork guarantees
- Hero image uses eager loading and high fetch priority.
- Artwork container is always visible and has a square aspect ratio.
- Role artwork uses `object-fit: contain`, so it is not cropped.
- Width is capped at 320px on regular mobile and 286px at 390px or below.
- Existing fallback icon remains available when the image file fails.

## Mobile overflow fixes
- Hero text blocks use `min-width: 0` and `overflow-wrap: anywhere`.
- Tagline explicitly allows normal wrapping and visible overflow.
- CTAs become a one-column, full-width stack under 800px.
- Confidence text wraps instead of forcing horizontal overflow.

## Cache protection
`index.html` now requests:
- `product-v3.css?v=3.5.0`
- `app.js?v=3.5.0`
- `product-v3.js?v=3.5.0`

This reduces the chance that iPhone Safari continues using an older CSS or JavaScript file after deployment.

## Validation performed
- Static lint: passed.
- JavaScript syntax and HTML ID validation: passed.
- Product/runtime tests: 23/23 passed.
- Overlay production build: passed.

## Remaining real-device check
After Netlify deploy, open the result page in a new private Safari tab and confirm:
- title appears first;
- square role artwork appears directly below the role names;
- description wraps within the viewport;
- the two CTAs are stacked vertically.
