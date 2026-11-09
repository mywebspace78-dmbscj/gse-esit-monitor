// Nightly price update for index.html (GSE Exit Monitor).
// Fetches daily prices from Alpha Vantage, one call at a time, and updates only the
// HIST_EXTRA, VOL and HI52 data and the "Closes are from Alpha Vantage as of" sentence.
import fs from 'node:fs';

const FILE = process.env.PAGE_FILE || 'index.html';
const KEY = process.env.ALPHAVANTAGE_API_KEY;
const MOCK_DIR = process.env.MOCK_DIR; // testing only: read <TICKER>.csv files instead of calling the API
const TICKERS = ['FNMA','FMCC','FNMAS','FMCKJ','FMCKM','FNMAT','FMCKL','FNMAI','FNMAJ','FNMFN','FNMAP','FNMAH',
  'FMCKI','FMCCG','FMCCH','FMCCN','FNMAL','FMCKK','FMCCO','FNMFM','FNMAG','FNMAN','FMCCT','FMCKP','FMCCJ'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchCsv(t) {
  if (MOCK_DIR) return fs.existsSync(`${MOCK_DIR}/${t}.csv`) ? fs.readFileSync(`${MOCK_DIR}/${t}.csv`, 'utf8') : '{"Information": "standard API rate limit is 25 requests per day"}';
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${t}&outputsize=compact&datatype=csv&apikey=${KEY}`;
  const res = await fetch(url);
  return await res.text();
}

function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const c = line.split(',');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0])) continue;
    rows.push({ d: c[0], h: +c[2], l: +c[3], c: +c[4], v: parseInt(c[5], 10) });
  }
  rows.sort((a, b) => b.d.localeCompare(a.d)); // newest first
  return rows;
}

// Find the {...} literal that starts at the first "{" after `marker`.
function locate(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`Marker not found: ${marker}`);
  const a = src.indexOf('{', i);
  let depth = 0;
  for (let k = a; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return [a, k + 1];
  }
  throw new Error(`Unbalanced braces after ${marker}`);
}
function edit(src, marker, fn) {
  const [a, b] = locate(src, marker);
  const obj = JSON.parse(src.slice(a, b));
  fn(obj);
  return src.slice(0, a) + JSON.stringify(obj) + src.slice(b);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pretty = d => { const [y, m, dd] = d.split('-'); return `${MONTHS[+m - 1]} ${+dd}, ${y}`; };

const data = {};
for (const t of TICKERS) {
  if (!MOCK_DIR) await sleep(1500);
  let text = await fetchCsv(t);
  let rows = parseCsv(text);
  if (!rows.length && /per second|burst|frequency/i.test(text)) { await sleep(5000); text = await fetchCsv(t); rows = parseCsv(text); }
  if (!rows.length) {
    console.log(`${t}: no data (${text.slice(0, 160).replace(/\s+/g, ' ')})`);
    if (/per day|25 requests|daily/i.test(text)) { console.log('Daily limit reached; stopping.'); break; }
    continue;
  }
  data[t] = rows;
  console.log(`${t}: ${rows[0].d} close ${rows[0].c}`);
}
if (!data.FNMA) { console.log('No FNMA data; leaving the page unchanged.'); process.exit(1); }

let src = fs.readFileSync(FILE, 'utf8');
const [ha, hb] = locate(src, 'HIST_EXTRA=');
const prevLatest = Object.keys(JSON.parse(src.slice(ha, hb)).FNMA || {}).sort().pop();
const latest = data.FNMA[0].d;
if (prevLatest && latest <= prevLatest) { console.log(`No new trading day (latest ${latest}); nothing to do.`); process.exit(0); }

src = edit(src, 'HIST_EXTRA=', o => {
  for (const [t, rows] of Object.entries(data)) {
    const h = o[t] || {};
    for (const r of rows) if (!(r.d in h)) h[r.d] = r.c;
    h[rows[0].d] = rows[0].c;
    o[t] = Object.fromEntries(Object.entries(h).sort(([a], [b]) => a.localeCompare(b)));
  }
});
src = edit(src, 'Object.assign(VOL,', o => {
  for (const [t, rows] of Object.entries(data)) {
    const last20 = rows.slice(0, 20);
    o[t] = { v: rows[0].v, d: rows[0].d, a: Math.round(last20.reduce((s, r) => s + r.v, 0) / last20.length) };
  }
});
src = edit(src, 'HI52=', o => {
  for (const [t, rows] of Object.entries(data)) {
    const e = o[t] || { h: -Infinity, l: Infinity };
    e.h = Math.max(e.h, ...rows.map(r => r.h));
    e.l = Math.min(e.l, ...rows.map(r => r.l));
    e.asof = rows[0].d;
    o[t] = e;
  }
});

const behind = TICKERS.filter(t => !data[t] || data[t][0].d !== latest);
const note = behind.length
  ? `Closes are from Alpha Vantage as of ${pretty(latest)}, except ${behind.map(t => {
      const hist = (JSON.parse(src.slice(...locate(src, 'HIST_EXTRA=')))[t]) || {};
      const d = Object.keys(hist).sort().pop();
      return d ? `${t} (${pretty(d)})` : t;
    }).join(', ')}.`
  : `Closes are from Alpha Vantage as of ${pretty(latest)}, for all series.`;
const re = /Closes are from Alpha Vantage as of [^.]*?(?:\([^)]*\))?[^.]*\./;
if (!re.test(src)) throw new Error('Footer date sentence not found');
src = src.replace(re, note);

fs.writeFileSync(FILE, src);
console.log(`Updated to ${latest}. ${Object.keys(data).length} series updated.${behind.length ? ' Older date: ' + behind.join(', ') : ''}`);
