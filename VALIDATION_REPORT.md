# Validation report

Environment: Node.js 22.16.0, npm 10.9.2.

| Command | Result |
|---|---|
| `npm install` | Passed; 0 vulnerabilities |
| `npm run generate:analytics-schema` | Passed; generated 3 deterministic SQL files for 55 events |
| `npm run check:analytics-schema` | Passed |
| `npm run test:analytics-contract` | Passed; 55 registered, 53 used, 2 unused warnings |
| `npm run test:analytics` | Passed; 28/28 checks |
| `npm run test:product` | Passed; 41/41 tests |
| `npm run lint` | Passed; 11 JavaScript files and 48 unique HTML IDs |
| `npm run build:overlay` | Passed |
| `npm run validate` | Not fully runnable in the overlay workspace: stopped at missing original `validate-data.mjs` |
| `npm run build` | Not fully runnable in the overlay workspace: original `analytics-config.js`, `data/`, and `images/` are intentionally not included |

The two blocked commands must be run after applying this overlay to the complete repository. They were not reported as passing here.
