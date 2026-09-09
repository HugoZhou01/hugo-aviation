# Chinese and English presentation

The homepage and gallery share the same photographs, records, counts, filters and links in both languages. The admin interface remains Chinese. Translations never write to the site API or photo library.

## Language selection

Selection order: a valid `?lang=en` / `?lang=zh` link, the saved manual choice, the first supported language in the browser's preference list, then English. Chinese variants such as `zh-HK` and `zh-TW` select the existing Simplified Chinese content. Footer buttons switch without reloading or clearing gallery filters and save only the language preference. Internal links carry the language so navigation also works when local storage is unavailable.

## Editing translations

Edit the reviewed Chinese-to-English entries in `src/scripts/i18n.js`. The original Chinese remains the source of truth. Existing site and photo seed content and public static labels are covered by `test/i18n.test.mjs`. When changing text in the admin interface, also update the corresponding translation before release; this is not an automatic translation service. Unknown new text stays visible rather than being silently replaced with an unrelated old translation. No content is sent to a translation provider.

The presentation layer translates text nodes and accessibility attributes, including newly rendered gallery and map details. It preserves original values for switching back to Chinese and excludes scripts, JSON data, styles, input values and language controls. The observer processes changed nodes, not the entire photo collection on scrolling. Map city labels are localized before building GeoJSON; airport English names come from the existing bilingual directory.

## Typography

English uses Helvetica Neue first, followed by Helvetica and Arial; Chinese falls back to PingFang SC or Microsoft YaHei. English headings use weight 300, body text 400, and primary navigation/buttons 500. Headings wrap naturally, mobile filter tabs scroll horizontally, and language buttons have at least 44px touch targets. MapLibre renders labels locally with the same font stack, avoiding separate remote glyph font downloads.

Helvetica Neue is a commercial typeface and is not bundled or redistributed. Devices without it use the documented fallbacks. Exact Helvetica Neue rendering on every platform requires appropriately licensed webfont files.

## Verification

Run the normal project check. Language tests cover browser preference ordering, manual overrides, unavailable storage, reversible rendering, current text coverage and preservation of numbers/photographic parameters. Also check both pages, the map, the photo dialog and filters in a real browser. Opening a photo makes the footer inert along with the rest of the background.

The same HTML is served for both languages; language selection and translated metadata run in the browser. This does not provide separately server-rendered English SEO pages or translate future editorial changes automatically.
