# Shenzhen · Hong Kong · Seoul travel guide

A self-contained, mobile-first travel guide with an interactive map, for a trip to
Shenzhen and Seoul (with Hong Kong day-trips).

Open **`index.html`** in any browser, it has no dependencies and works offline apart
from live map tiles. Hosted via GitHub Pages.

## Features
- Map (Leaflet + OpenStreetMap, dark theme) with category-coloured pins.
- City toggle (Shenzhen / Hong Kong / Seoul), search, and filters: category chips,
  "open now", day-of-week, favourites.
- Per-place cards: photos (tap to zoom), price in local currency + €, live open/closed
  status, a 7-day hours strip, phone / WeChat, a 🗺️ Map link (Apple Maps, with
  GCJ-02-corrected coordinates for mainland China), a ▶ video where one exists, and
  door-to-door commute info from the Shekou base.
- Itinerary-aware **Events** tab: family-friendly events along the trip dates, defaulting
  to "today".
- Favourites and editable exchange rates persist in the browser.

## Editing / rebuilding
Data lives in `places.json` (+ a `enrich.json` overlay for photos/contacts/commute/video)
and `events.json`; config in `data.js`. Regenerate the single-file `index.html` with:

```sh
python3 build.py
```
