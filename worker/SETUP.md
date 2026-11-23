# Photo manager: setup

The academy changes website photos from a phone at **https://koreanmartialarts.com.np/admin**.

## How it works

- The website itself stays on **GitHub Pages**, exactly as before.
- This small **Cloudflare Worker** runs in front of it on the same domain. It:
  - serves the `/admin` page (password protected),
  - stores uploaded photos in a **Cloudflare D1** database (`kmaa-photos`). D1 is part of the
    free Workers plan, so **no payment card is needed**,
  - writes the newest photos and the gallery into each page as visitors load it.
- If no photo has been uploaded for a spot, the original file from this repo is shown.
- If the Worker is ever switched off, the site still works with the original photos.
  The gallery just stays hidden.

Editable spots are marked in `index.html` with `data-slot="..."`. The gallery is the
`data-gallery` section.

## One-time setup (about 10 minutes, no card needed)

Run these in this `worker` folder:

1. **Install and log in to Cloudflare:**

   ```sh
   cd worker
   npm install
   npx wrangler login          # opens the browser to approve access
   ```

2. **Create the database:**

   ```sh
   npx wrangler d1 create kmaa-photos
   ```

   It prints a `database_id`. Paste it into `wrangler.jsonc` in place of
   `PASTE-DATABASE-ID-HERE`. The tables are created automatically the first time the site runs.

3. **Set the admin password, then deploy:**

   ```sh
   npm run set-password        # type the password the academy will use
   npm run deploy
   ```

   Pick a strong password of at least 12 characters (a short phrase works well), and give it
   to the client privately.

4. **Push the site changes** (`index.html`, `styles.css`, `app.js`) to GitHub as usual, so
   GitHub Pages publishes them. You can do this before or after step 3.
5. Open **https://koreanmartialarts.com.np/admin** on a phone, log in, change a photo, then
   check the website.

## Later

- **Change the password:** run `npm run set-password` again. Every phone is logged out.
- **Code changes to the Worker:** `npm run deploy`.
- **Test locally:** copy `.dev.vars.example` to `.dev.vars`. Run
  `python3 -m http.server 8000 --bind 127.0.0.1` in the repo root, then run `npm run dev` here
  and open http://localhost:8787/admin.
- **Back up the photos:** `npx wrangler d1 export kmaa-photos --remote --output backup.sql`.

## Notes

- A logged-in phone stays logged in for 180 days.
- Photos are resized on the phone before uploading (main photos up to 1600px, gallery up to
  1600px with a 640px preview), so uploads are fast on mobile data.
- When either coach photo is replaced, the top section of the page shows both coaches as framed,
  slightly tilted photos instead of cut-outs. Ordinary phone photos look right that way.
- The gallery holds up to 200 photos, newest first. That's about 100–150 MB, well inside the
  free plan's 5 GB.
- Each photo can be at most about 1.9 MB after resizing. The admin page shrinks any rare photo
  that is bigger before uploading it.
