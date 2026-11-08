# GSE Exit Monitor

Website files for the GSE Exit Monitor, a tracker for Fannie Mae (FNMA) and Freddie Mac (FMCC) common and junior preferred stock through conservatorship.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole site: content, prices, tables and charts in one file |
| `privacy.html` | Privacy policy (needed for Google AdSense), with your contact email |
| `404.html` | "Page not found" page |
| `favicon.svg` | Browser tab icon |
| `robots.txt` | Lets search engines index the site |
| `ads.txt` | AdSense seller file. Add the line from your AdSense account after approval |

## Publish on GitHub Pages

1. On github.com, create a new **public** repository, for example `gse-exit-monitor`.
2. Click **Add file → Upload files**, drag in all the files from this folder, and click **Commit changes**.
3. Go to **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main** and folder to **/ (root)**, then **Save**.
4. After a minute or two, the site is live at `https://<your-username>.github.io/gse-exit-monitor/`.

## Use your own domain

1. Buy the domain (for example `gseexitmonitor.com`) from a registrar.
2. In **Settings → Pages → Custom domain**, enter the domain and save. GitHub adds a `CNAME` file to the repository for you.
3. At your registrar, add the DNS records GitHub's Pages documentation lists for an apex domain (four `A` records) and a `CNAME` record for `www` pointing to `<your-username>.github.io`.
4. Once DNS has updated, tick **Enforce HTTPS** in Settings → Pages.

## Turning on ads (after AdSense approval)

1. Paste the AdSense script tag where `index.html` says `GOOGLE ADSENSE` in the page head.
2. Find `ad-slot-1` and `ad-slot-2` in `index.html`, paste an ad unit's code inside each, and delete the word `hidden` from each slot.
3. Replace the comment lines in `ads.txt` with the line from your AdSense account.

## Nightly prices

Prices are stored inside `index.html`. Until the nightly update is switched to publish here, the newest prices appear on the Claude-hosted page first. Once GitHub is connected to Claude, the 7:30 PM update can commit the new `index.html` to this repository automatically.
