# Validation Report — v3.5

Executed in the supplied update workspace:

- `npm run lint`: PASS
- `npm run test:product`: PASS — 23/23
- `npm run build:overlay`: PASS

New regression coverage verifies:

- Hero DOM order is heading → artwork → body.
- Mobile CSS uses the same named-area order.
- Hero artwork remains square and uncropped.
- Description can wrap without horizontal clipping.
- Mobile result actions are full-width and vertically stacked.
- Existing carousel, community, Analytics URL, sharing and focus-map tests remain green.

Not claimed:

- Physical iPhone Safari screenshot verification after Netlify deployment.
- Full repository `npm run validate`, because this update package intentionally does not contain the user's private `analytics-config.js` or original production data/assets.
