# Agent script — collect Burkinabè artists + legal photos

Paste this whole file as the agent task. Artists only. Do not write app code, migrations, or `INSERT` unless a human later says to add rows.

Temba is tembas.com. French UI. Buyer pages: `/artists`, `/artists/:slug`.

---

## Goal

Produce a JSON file of **real performing artists** who belong on Temba, with a **usable portrait URL**. Burkina Faso only (`country_code = BF`). A row without a legal photo is not ready.

Live table (Paris project `wlyncuwbzhzjafmqozcm`) already has ~40 names. Most fail `npm run validate:artists`: encyclopedia rows use Pexels/Deezer/Last.fm; later rows have `photo_url` null. This pass **fills photos and new names**. Do not invent people.

---

## What counts as an artist

A person or group a buyer can pay to see live. Headliner or billed act.

Not: organizers, venues, DJs-as-hosts, radio presenters unless they headline, fake stubs, Ivorian/Togolese acts billed as BF (Beynaud, Elom 20ce — reject or flag, never `country_code=BF`).

Playing Ouaga does not make someone Burkinabè.

---

## Live columns (do not invent fields)

| Column | Rule |
|---|---|
| `name` | Stage name as on posters |
| `slug` | French URL-safe: lowercase, hyphens, accent-fold. `alif-naaba`, `miss-tanya`, `soeur-anne-marie-kabore` |
| `bio` | French, 1–3 factual sentences, ≥40 chars. Past tense if deceased |
| `genre` | One label, French when natural (Afropop, Hip-hop, Folk, Gospel, Jazz, Coupé-décalé) |
| `photo_url` | Required for `ready` |
| `cover_image_url` | Optional second legal still, or null |
| `country_code` | Always `BF` for this pass |
| `city` | Ouagadougou, Bobo-Dioulasso, or known home city |
| `social_links` | JSON: `instagram`, `facebook`, `youtube`, `twitter`, `website` — only URLs you found |
| `verified` | Always `false` for new/updated collector rows |

Notes **outside** the table: `also_known_as`, `evidence`, `sources`, `image_licence`, `image_credit`, `status`, `confidence`.

---

## Photo rules (hard)

A row is **`ready`** only if `photo_url` is a **direct image file** that loads, shows **that** artist, and is legally usable.

**Accept**

1. Wikimedia Commons / Wikipedia — licence CC BY, CC BY-SA, CC0, or Public Domain. Use `https://upload.wikimedia.org/wikipedia/commons/...` (original or a large thumbnail), **not** the `File:` wiki page. Record licence + author.
2. Official artist / label / press kit page, with that page in `sources`.
3. Existing Temba storage: `*.wlyncuwbzhzjafmqozcm.supabase.co` if a public object already exists.

**Reject (validator will fail)**

- `images.pexels.com`, Unsplash, random stock as “the artist”
- Deezer `dzcdn`, Last.fm Fastly, Spotify `i.scdn.co`, Apple Music
- Instagram / Facebook CDN (expires)
- AI faces, guessed faces, fan screenshots with no licence

If no legal image: `status: needs_photo`, `photo_url: null`. Never pad with junk.

### How to find Wikimedia files

1. Search Commons: `https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&format=json&srsearch=` + artist name (and “Burkina”).
2. Open the File page; confirm it is that person (not a namesake, not a concert crowd).
3. Read licence. Skip “fair use”, “non-commercial only”, missing licence.
4. Take the **original file URL** from the file history / “Original file” link (`upload.wikimedia.org`).
5. `HEAD`/`GET` the URL. Must be `image/*` and HTTP 200.
6. Set `image_licence` (e.g. `CC BY-SA 4.0`) and `image_credit` (author as on Commons).

---

## Method (do this in order)

1. Fetch live artists (anon REST on Paris URL + key from `.env.local`):  
   `artists?select=id,name,slug,bio,genre,photo_url,cover_image_url,country_code,city,social_links,verified`
2. Split live rows into: **needs_photo** (null or banned host) vs already legal (rare).
3. **Repair photos first** for existing BF names (do not change `slug` unless it is broken).
4. Then collect **new** BF live acts not already on Temba. Target 15–30 new this pass. ≥2 independent sources each (Sidwaya, Burkina24, RFI, Kundé, billed concert, official site).
5. Merge aliases into one record (Hawa = Awa Boussim; Smarty ≠ Yeleen; Sams’K Le Jah = Karim Sama).
6. Write `scripts/artist-candidates.json` (see schema).
7. Run:

```bash
node scripts/validate-artists.mjs scripts/artist-candidates.json
```

Fix every `fail` before finishing. `warn` is allowed (unlisted host with licence note, slug vs folded name).

8. Do **not** INSERT. Human reviews `ready` rows.

---

## Output file

Path: `scripts/artist-candidates.json`

```json
{
  "generated_at": "ISO date",
  "artists": [
    {
      "name": "",
      "slug": "",
      "bio": "",
      "genre": "",
      "photo_url": null,
      "cover_image_url": null,
      "country_code": "BF",
      "city": "",
      "social_links": {},
      "verified": false,
      "status": "ready",
      "image_licence": "",
      "image_credit": "",
      "also_known_as": [],
      "evidence": [],
      "sources": [],
      "confidence": "high"
    }
  ]
}
```

`status`: `ready` | `needs_photo` | `reject`  
`confidence`: `high` | `medium` | `low`

Final agent message (short):

- Counts: live / ready / needs_photo / reject
- Paths of JSON + validator exit code
- Rejected names and why
- Gaps still empty (women, Bobo, gospel, hip-hop, jazz)

---

## Known live slugs (do not duplicate as new)

alif-naaba, amity-meria, amzy, art-melody, bil-aka-kora, dez-altino, dicko-fils, djeli-karim, donsharp-de-batoro, ella-nikiema, elom-20ce, eunice-goula, fadeen, farafina, floby, greg-burkimbila, hamed-smani, hawa-boussim, huguo-boss, imilo-lechanceux, joey-le-soldat, jonathan-napon, k-rim, kady-diarra, kayawoto, lelue-111, marie-gayeri, miss-tanya, nabalum, nourat, reman, samsk-le-jah, sana-bob, serge-beynaud, smarty, smockey, soeur-anne-marie-kabore, sofiano, victor-deme, yeleen

Flag `elom-20ce` and `serge-beynaud` as **not BF** if you touch them. Do not “fix” them to Burkina.

---

## Out of scope

Vite/React, Netlify, payments, `event_artists` links, fake concerts, `verified=true`, US Supabase `uwmlagvsivxqocklxbbo`.
