# XR Lab Vibes

XR Lab Vibes is a fullscreen digital signage board for an XR lab. It presents the lab's current status, posted hours, featured games and experiences, events, faculty resources, promotions, memes, and a leaderboard in a rotating, touch-friendly slideshow.

The board is built with plain HTML, CSS, and JavaScript. It has no build step or package dependencies, and its settings are managed directly in the browser.

## Features

- Automatic open/closed status based on configurable weekday hours
- Optional manual status and custom announcement banner
- Configurable slide visibility, rotation interval, and page refresh interval
- Touch, mouse, scroll wheel, and keyboard navigation
- Rotating XR game and experience showcase
- Live clock and date
- Landscape display prompt for portrait devices
- Browser-local settings with JSON import and export
- Responsive fullscreen layout designed for a kiosk or wall display

## Run locally

The slide files are loaded with `fetch()`, so serve the project through a local web server instead of opening `index.html` directly.

From the project directory, run one of the following:

```bash
python3 -m http.server 8000
```

or, if you have Node.js installed:

```bash
npx serve .
```

Then open `http://localhost:8000` (or the address printed by your chosen server) in a browser.

An internet connection is required on first load for Tailwind CSS, which is loaded from its CDN. The project images and custom stylesheet are stored locally.

## Using the board

The board rotates through all enabled slides automatically. You can also navigate manually:

- Press the left or right arrow key.
- Swipe horizontally on a touch display.
- Tap the left or right edge of the screen.
- Scroll with a mouse wheel or trackpad.
- Select a navigation dot at the bottom of the screen.

Manual navigation restarts the automatic rotation timer.

## Admin controls

Open **Vibe Board Controls** from the large invisible area at the bottom center of the screen by either:

- pressing and holding for about 1.2 seconds, or
- tapping three times within about 1.2 seconds.

The control panel lets you change:

- the current status and automatic status behavior
- posted weekday hours
- the board title, subtitle, location, and hero image
- the announcement banner
- refresh and slide rotation timing
- which screens are shown

Choose **Save** to apply the settings. Settings are stored in the current browser using `localStorage`, so they do not automatically transfer to another browser, device, hostname, or browser profile.

Use **Export settings** to download a JSON backup and **Import settings** to restore it on this or another display. **Reset to defaults** restores the values defined in `app.js`.

## Customize content

Most board content can be changed in these locations:

| Content | File or location |
| --- | --- |
| Default settings and hours | `app.js` (`defaultSettings` and `defaultLabHours`) |
| Featured games and descriptions | `app.js` (`gameShowcaseItems`) |
| Individual screen content | `slides/*.html` |
| Layout, colors, and animations | `style.css` |
| Hero, game, and supporting images | `assets/` |
| Slide order | Placeholder order in `index.html` |

When adding an image, keep it inside `assets/` and use a path relative to `index.html`, such as `assets/images/example.webp`.

### Add a slide

1. Create a new HTML fragment in `slides/`. Its outer element should include a unique `data-slide` value.
2. Add a matching `.slide-placeholder` entry to the `#slides` element in `index.html`.
3. If the slide should be configurable in the admin panel, add its setting and checkbox handling in `app.js` and its control in `index.html`.

## Project structure

```text
.
├── index.html          # Board shell and admin panel
├── app.js              # Settings, status, carousel, and board behavior
├── style.css           # Board and slide styling
├── slides/             # HTML fragments for individual screens
└── assets/             # Hero, game, meme, and supporting media
```

## Deploy

Upload the repository to any static web host, such as GitHub Pages, Netlify, an internal web server, or a kiosk's local HTTP server. No compilation step is required: publish the repository root as the site root.

For a dedicated display, open the deployed page in a modern browser, switch the browser to fullscreen, and disable sleep or screen blanking at the operating-system level.

## Browser support

Use a current version of Chrome, Edge, Firefox, or Safari. The board relies on modern browser features including `fetch`, `localStorage`, pointer events, optional persistent storage, and CSS custom properties.
