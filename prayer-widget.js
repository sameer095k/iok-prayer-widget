// IOK Prayer Times — azan (IOK) + iqamah for IOK & CHESS
// Background: Janamaz.png saved in iCloud Drive > Scriptable (also cached from
// the git repo when reachable).
// Home screen (medium): prayer table, IOK azan only, iqamah per masjid.
// Lock screen: upcoming prayer only (name + time). Widget refreshes after each prayer.

const LOCS = [
  { id: "iok",   name: "IOK" },
  { id: "chess", name: "CHESS" },
];
// Names the widget looks for, in order, inside iCloud Drive > Scriptable.
const BG_FILES = ["Janamaz.png", "Janamaz.jpg", "janamaz.png", "janamaz.jpg"];

// ---------- data ----------
const fmLocal = FileManager.local();
const cacheDir = fmLocal.joinPath(fmLocal.documentsDirectory(), "iok-prayer");
function saveCache(id, obj) {
  try {
    if (!fmLocal.fileExists(cacheDir)) fmLocal.createDirectory(cacheDir, true);
    fmLocal.writeString(fmLocal.joinPath(cacheDir, id + ".json"),
      JSON.stringify({ date: cacheStamp, json: obj }));
  } catch (e) {}
}
// sameDayOnly: only accept the cache if it was stored today. Intraday
// refreshes never hit the network — the schedule doesn't change mid-day,
// so the lock screen keeps working when the phone drops offline.
function loadCache(id, sameDayOnly) {
  try {
    const p = fmLocal.joinPath(cacheDir, id + ".json");
    if (fmLocal.fileExists(p)) {
      const c = JSON.parse(fmLocal.readString(p));
      if (c && c.json && c.json.fe && (!sameDayOnly || c.date === cacheStamp)) return c;
    }
  } catch (e) {}
  return null;
}
async function fetchTimes(id) {
  const cached = loadCache(id, true);
  if (cached) return { json: cached.json, stale: false };
  for (const u of [
    `http://isalaah.com/loc/ca/schedule.php?p=clk&loc=${id}`,
    `https://isalaah.com/loc/ca/schedule.php?p=clk&loc=${id}`,
  ]) {
    try {
      const r = new Request(u);
      r.method = "POST";
      r.timeoutInterval = 15;
      const j = await r.loadJSON();
      if (j && j.fe) { saveCache(id, j); return { json: j, stale: false }; }
    } catch (e) {}
  }
  // Offline with no cache from today: show the last day we have, marked stale,
  // rather than a blank widget.
  const old = loadCache(id, false);
  return { json: old ? old.json : null, stale: true };
}

function prayerList(j) {
  return [
    { name: "Fajr",    azan: j.fe, iqamah: j.f, period: "AM" },
    { name: "Shurooq", azan: j.s,  iqamah: null, period: "AM" },
    { name: "Dhuhr",   azan: j.de, iqamah: j.d, period: "PM" },
    { name: "Asr",     azan: j.ae, iqamah: j.a, period: "PM" },
    { name: "Maghrib", azan: j.me, iqamah: j.m, period: "PM" },
    { name: "Isha",    azan: j.ie, iqamah: j.i, period: "PM" },
  ].filter(p => p.azan);
}

// NOTE: the site's own date label runs a day ahead in the evening,
// so the widget uses the phone's real date instead.
const now = new Date();
// Stable same-day key for the local cache ("2026-09-16"), locale-independent.
const cacheStamp = now.toLocaleDateString("en-CA");
const todayLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const dayShort = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function prayerDate(t, period) {
  const [h, m] = t.split(":").map(Number);
  let hh = h % 12; if (period === "PM") hh += 12;
  const d = new Date(todayLabel);
  d.setHours(hh, m || 0, 0, 0);
  return d;
}
// Next upcoming prayer; wraps to tomorrow's Fajr after Isha.
function nextPrayer(list) {
  for (const p of list) {
    const d = prayerDate(p.azan, p.period);
    if (d > now) return { prayer: p, date: d };
  }
  const p0 = list[0];
  const d = prayerDate(p0.azan, p0.period);
  d.setDate(d.getDate() + 1);
  return { prayer: p0, date: d };
}
// "6:42" + "PM" -> "6:42p"
function fmtShort(t, period) {
  return `${t}${period === "PM" ? "p" : "a"}`;
}
function prayerTimeLine(p) {
  return p.iqamah ? `${fmtShort(p.azan, p.period)} → ${fmtShort(p.iqamah, p.period)}`
                  : fmtShort(p.azan, p.period);
}

// "UPCOMING TIME CHANGES: BEGINNING SUNDAY, SEPTEMBER 13: FAJR AZAN 6:00 ..."
// -> "⏳ CHESS from Sun Sep 13: Fajr 5:22→6:00 · Isha 8:16→8:30"
// Newer prose format: "Fajr will be 6:10 AM on Sunday, Sep 27 | Isha will be ..."
// -> "⏳ CHESS from Sun Sep 27: Fajr 6:00→6:10a · Isha 8:30→8:20p"
// Always condenses to a single line so the announcement can't push the
// widget past its height and get clipped at the bottom edge.
const cap3 = s => s.charAt(0).toUpperCase() + s.slice(1, 3).toLowerCase();
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const MON3 = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
               jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const WD3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// "Sep" + "27" -> Date. Rolls to next year when the date is long past
// (announcement posted in December for a January change).
function effDate(monthStr, dayStr) {
  const m = MON3[monthStr.slice(0, 3).toLowerCase()];
  if (m === undefined) return null;
  const d = new Date(now.getFullYear(), m, Number(dayStr));
  if (d < new Date(todayLabel) && (new Date(todayLabel) - d) > 60 * 864e5)
    d.setFullYear(d.getFullYear() + 1);
  return d;
}
function toMin(t, period) {
  const [h, m] = t.split(":").map(Number);
  let hh = h % 12; if (period === "PM") hh += 12;
  return hh * 60 + (m || 0);
}
function dateKey(d) {
  const mon = ["jan", "feb", "mar", "apr", "may", "jun",
               "jul", "aug", "sep", "oct", "nov", "dec"][d.getMonth()];
  return `${WD3[d.getDay()]} ${cap3(mon)} ${d.getDate()}`;
}
function announcementLine(text, locName, azanNow, iqamahNow, periods) {
  const items = []; // {pname, old, neu, date}
  let baseDate = null;
  const dm = text.match(/BEGINNING\s+([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})/i);
  if (dm) baseDate = effDate(dm[2], dm[3]);

  // old "FAJR AZAN 6:00" format
  const re = /([A-Za-z]+)\s+(AZAN|IQAMAH)\s+(\d{1,2}:\d{2})/gi;
  let mm;
  while ((mm = re.exec(text)) !== null) {
    const pname = cap1(mm[1]);
    if (!azanNow[pname] && !iqamahNow[pname]) continue;
    const cur = mm[2].toUpperCase() === "AZAN" ? azanNow[pname] : iqamahNow[pname];
    items.push({ pname, old: cur || null, neu: mm[3], date: baseDate });
  }

  // prose "Fajr will be 6:10 AM on Sunday, Sep 27" format. The site doesn't
  // say azan vs iqamah, so the old time is whichever current time sits
  // closest to the new one (usually the iqamah shifting a few minutes).
  const re2 = /([A-Za-z]+)\s+will be\s+(\d{1,2}:\d{2})\s*(AM|PM)\s+on\s+[A-Za-z]+,?\s+([A-Za-z]+)\s+(\d{1,2})/gi;
  let m2;
  while ((m2 = re2.exec(text)) !== null) {
    const pname = cap1(m2[1]);
    const per = periods[pname];
    const cands = [];
    if (azanNow[pname]) cands.push(azanNow[pname]);
    if (iqamahNow[pname]) cands.push(iqamahNow[pname]);
    if (!per || !cands.length) continue;
    const neuMin = toMin(m2[2], m2[3].toUpperCase());
    let old = null, bestD = 1e9;
    for (const c of cands) {
      const d = Math.abs(toMin(c, per) - neuMin);
      if (d < bestD) { bestD = d; old = c; }
    }
    if (old && toMin(old, per) === neuMin) old = null;
    items.push({ pname, old, neu: fmtShort(m2[2], m2[3].toUpperCase()),
                 date: effDate(m2[4], m2[5]) });
  }

  if (!items.length) {
    // Unparseable: compact the raw text onto one line rather than clipping it.
    const cleaned = text.replace(/^UPCOMING TIME CHANGES:\s*/i, "").replace(/\s+/g, " ").trim();
    if (!cleaned) return null;
    const short = cleaned.length > 78 ? cleaned.slice(0, 75).trimEnd() + "…" : cleaned;
    return { text: `⏳ ${locName}: ${short}`, lines: 1 };
  }
  const todayMid = new Date(todayLabel);
  const live = items.filter(it => !it.date || it.date > todayMid);
  if (!live.length) return null; // already in effect
  const groups = {};
  for (const it of live) {
    const k = it.date ? dateKey(it.date) : "soon";
    (groups[k] = groups[k] || []).push(`${it.pname} ${it.old ? it.old + "→" : "→"}${it.neu}`);
  }
  const segs = Object.keys(groups).map(k => `from ${k}: ${groups[k].join(" · ")}`);
  return { text: `⏳ ${locName} ${segs.join(" · ")}`, lines: 1 };
}

// ---------- background ----------
// The rug lives in the git repo; the widget downloads it once and caches it
// on the phone. (Direct download only works if the repo is public; otherwise
// save janamaz.jpg into iCloud Drive > Scriptable and the widget uses that.)
const BG_URL = "https://raw.githubusercontent.com/sameer095k/iok-prayer-widget/main/janamaz.jpg";
async function loadBackground() {
  const local = FileManager.local();
  // v2 cache name: bump this whenever janamaz.jpg changes in the repo so the
  // phone re-downloads instead of serving the stale cached rug.
  const cached = local.joinPath(local.joinPath(local.documentsDirectory(), "iok-prayer"), "janamaz-v2.jpg");
  try {
    if (local.fileExists(cached)) return local.readImage(cached);
    const req = new Request(BG_URL);
    req.timeoutInterval = 20;
    const img = await req.loadImage();
    if (img) {
      try {
        const dir = local.joinPath(local.documentsDirectory(), "iok-prayer");
        if (!local.fileExists(dir)) local.createDirectory(dir, true);
        local.writeImage(cached, img);
      } catch (e) {}
      return img;
    }
  } catch (e) {}
  try {
    const fm = FileManager.iCloud();
    for (const name of BG_FILES) {
      const p = fm.joinPath(fm.documentsDirectory(), name);
      if (!fm.fileExists(p)) { try { await fm.downloadFileFromiCloud(p); } catch (e) {} }
      if (fm.fileExists(p)) return fm.readImage(p);
    }
  } catch (e) {}
  return null;
}

// ---------- text styling (readable over the bright rug) ----------
const WHITE = Color.white();
const DIM = new Color("#ffffff", 0.75);
function styled(t, font, color) {
  t.font = font;
  t.textColor = color || WHITE;
  t.shadowColor = new Color("#000000", 0.6);
  t.shadowRadius = 4;
  t.shadowOffset = new Point(0, 2);
  return t;
}

// ---------- load ----------
const data = [];
for (const L of LOCS) {
  const { json, stale } = await fetchTimes(L.id);
  if (json) data.push({ loc: L, json, stale, list: prayerList(json) });
}

const w = new ListWidget();
const bg = await loadBackground();
if (bg) w.backgroundImage = bg;
else w.backgroundColor = new Color("#1e3a5f"); // fallback if janamaz.jpg isn't on the phone yet

if (!data.length) {
  styled(w.addText("Couldn't load prayer times."), Font.systemFont(12));
} else if (config.runsInAccessoryWidget) {
  // ----- lock screen: upcoming prayer only -----
  const d0 = data.find(d => d.loc.id === "iok") || data[0];
  const np = nextPrayer(d0.list);
  const p = np.prayer;
  const fam = config.widgetFamily || "";
  if (fam === "accessoryCircular") {
    const n = styled(w.addText(p.name), Font.semiboldSystemFont(10)); n.centerAlignText();
    const t = styled(w.addText(fmtShort(p.azan, p.period)), Font.boldSystemFont(15)); t.centerAlignText();
  } else if (fam === "accessoryInline") {
    styled(w.addText(`Next: ${p.name} ${prayerTimeLine(p)}`), Font.systemFont(13));
  } else {
    // rectangular: big upcoming prayer + time
    w.addSpacer();
    const v = w.addStack(); v.layoutVertically();
    const lab = styled(v.addText("NEXT PRAYER"), Font.systemFont(9), DIM); lab.centerAlignText();
    v.addSpacer(3);
    const nm = styled(v.addText(p.name.toUpperCase()), Font.semiboldSystemFont(20)); nm.centerAlignText();
    v.addSpacer(2);
    const tm = styled(v.addText(prayerTimeLine(p)), Font.boldSystemFont(17)); tm.centerAlignText();
    w.addSpacer();
  }
  // refresh shortly after this prayer so "upcoming" flips at the right time
  w.refreshAfterDate = new Date(np.date.getTime() + 2 * 60000);
} else {
  // ----- home screen: prayer rows, shared azan, iqamah per masjid -----
  const stale = data.some(d => d.stale);
  const head = styled(w.addText(`🕌 Prayer Times · ${dayShort}${stale ? " · offline" : ""}`),
    Font.semiboldSystemFont(13));
  w.addSpacer(6);

  const base = data.find(d => d.loc.id === "iok") || data[0];
  const other = data.find(d => d !== base);
  const omap = {};
  if (other) for (const p of other.list) omap[p.name] = p;
  const np = nextPrayer(base.list);
  const next = np.prayer.name;

  const nameW = 78, timeW = 74;
  function rowCells(cells, isHeader, isNext) {
    const row = w.addStack();
    row.layoutHorizontally();
    cells.forEach((c, i) => {
      if (i > 0) row.addSpacer();
      const cell = row.addStack();
      cell.size = new Size(i === 0 ? nameW : timeW, 0);
      const t = cell.addText(c);
      if (isHeader) {
        styled(t, Font.systemFont(10.5), DIM);
      } else {
        styled(t, isNext ? Font.boldSystemFont(13) : Font.systemFont(12.5),
          isNext ? WHITE : (i === 0 ? new Color("#ffffff", 0.92) : WHITE));
      }
      if (i > 0) t.rightAlignText();
    });
  }

  rowCells(["", "Azan", base.loc.name, other ? other.loc.name : ""], true, false);
  w.addSpacer(3);
  for (const p of base.list) {
    const q = omap[p.name] || {};
    const azan = p.azan; // IOK azan only — ignore CHESS azan even when it differs
    rowCells([p.name, azan, p.iqamah || "–", q.iqamah || (other ? "–" : "")], false, p.name === next);
  }

  // upcoming time-change announcements, one delta line per masjid
  const azanNow = {};
  for (const p of base.list) azanNow[p.name] = p.azan;
  for (const d of data) {
    const txt = d.json.timeChanges;
    if (!txt) continue;
    const iqNow = {};
    const perMap = {};
    for (const p of d.list) { iqNow[p.name] = p.iqamah; perMap[p.name] = p.period; }
    const a = announcementLine(txt, d.loc.name, azanNow, iqNow, perMap);
    if (!a) continue;
    w.addSpacer(4);
    const f = styled(w.addText(a.text), Font.systemFont(12.5), new Color("#ffd97a"));
    f.lineLimit = 1;
    f.minimumScaleFactor = 0.7;
  }

  // refresh shortly after the next prayer so highlighting + times stay current
  w.refreshAfterDate = new Date(np.date.getTime() + 2 * 60000);
}

if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
