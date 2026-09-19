# GitHub Pages web demo

The repository automatically exports the Expo web build and publishes the generated static files to the `gh-pages` branch on every push to `main`.

The build uses Expo's GitHub Pages base path only in CI, so normal local development remains rooted at `/`.

## One-time GitHub setting

If Pages has not already been enabled:

1. Open **Settings → Pages** for `PriceyLewis/StudentToolKit-OS-Demo`.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `gh-pages` and `/ (root)`.
4. Save.

The public URL will then be:

`https://priceylewis.github.io/StudentToolKit-OS-Demo/`

No generated `dist/` build output is stored on `main`; only the deploy branch contains the static export.
