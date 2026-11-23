# Aptech Solar

Aptech's responsive solar website, built with static HTML, CSS, and JavaScript.
The site includes the home, About, Services, Contact, and Booking pages, plus
the interactive solar product experience and embedded story sections.

## Run locally

Requires Node.js. No package installation or build step is needed.

```sh
npm start
```

Open <http://127.0.0.1:4174/>. The other pages are available at `/about.html`,
`/services.html`, `/contact.html`, and `/booking.html`.

## Project structure

- `index.html` and the other root HTML files contain the site pages.
- `css/` and `js/` contain page styling and interactive behavior.
- `assets/images/`, `assets/videos/`, `assets/fonts/`, and `assets/portal/`
  contain media and embedded experience assets used by the pages.
- `server.mjs` is a small local preview server with byte-range support for video.

## Before publishing

Run `npm run check` to check the local JavaScript files for syntax errors. Keep
the relative folder structure when hosting the static site. The WhatsApp links
are configured for Aptech's current contact number.
