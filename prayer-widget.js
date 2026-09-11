// IOK Prayer Times — azan (IOK) + iqamah for IOK & CHESS
// Home screen (medium): prayer rows, azan from IOK, iqamah per masjid.
// Lock screen: IOK only. Rectangular = 2 cols x 3 rows; circular/inline = next prayer.

const LOCS = [
  { id: "iok",   name: "IOK" },
  { id: "chess", name: "CHESS" },
];

// ---------- data ----------
const fm = FileManager.local();
const cacheDir = fm.joinPath(fm.documentsDirectory(), "iok-prayer");
function saveCache(id, obj) {
  try {
    if (!fm.fileExists(cacheDir)) fm.createDirectory(cacheDir, true);
    fm.writeString(fm.joinPath(cacheDir, id + ".json"), JSON.stringify(obj));
  } catch (e) {}
}
function loadCache(id) {
  try {
    const p = fm.joinPath(cacheDir, id + ".json");
    if (fm.fileExists(p)) return JSON.parse(fm.readString(p));
  } catch (e) {}
  return null;
}
async function fetchTimes(id) {
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
  return { json: loadCache(id), stale: true };
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
const todayLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const dayShort = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function prayerDate(t, period) {
  const [h, m] = t.split(":").map(Number);
  let hh = h % 12; if (period === "PM") hh += 12;
  const d = new Date(todayLabel);
  d.setHours(hh, m || 0, 0, 0);
  return d;
}
function nextPrayerName(list) {
  for (const p of list) if (prayerDate(p.azan, p.period) > now) return p.name;
  return list[0].name;
}

// "UPCOMING TIME CHANGES: BEGINNING SUNDAY, SEPTEMBER 13: FAJR AZAN 6:00 ..."
// -> "⏳ CHESS from Sun Sep 13: Fajr 5:22→6:00 · Isha 8:16→8:30"
const cap3 = s => s.charAt(0).toUpperCase() + s.slice(1, 3).toLowerCase();
function announcementLine(text, locName, azanNow, iqamahNow) {
  let dateBit = "";
  const dm = text.match(/BEGINNING\s+([A-Za-z]+),?\s+([A-Za-z]+)\s+(\d{1,2})/);
  if (dm) {
    const eff = new Date(`${dm[2]} ${dm[3]}, ${now.getFullYear()}`);
    if (!isNaN(eff.getTime()) && eff <= new Date(todayLabel)) return null; // already in effect
    dateBit = ` from ${cap3(dm[1])} ${cap3(dm[2])} ${dm[3]}`;
  }
  const deltas = [];
  const re = /([A-Za-z]+)\s+(AZAN|IQAMAH)\s+(\d{1,2}:\d{2})/gi;
  let mm;
  while ((mm = re.exec(text)) !== null) {
    const pname = mm[1].charAt(0).toUpperCase() + mm[1].slice(1).toLowerCase();
    const cur = mm[2].toUpperCase() === "AZAN" ? azanNow[pname] : iqamahNow[pname];
    deltas.push(cur ? `${pname} ${cur}→${mm[3]}` : `${pname} →${mm[3]}`);
  }
  if (!deltas.length) {
    const cleaned = text.replace(/^UPCOMING TIME CHANGES:\s*/i, "").trim();
    if (!cleaned) return null;
    return { text: `⏳ ${locName}: ${cleaned}`, lines: 2 };
  }
  return { text: `⏳ ${locName}${dateBit}: ${deltas.join(" · ")}`, lines: 1 };
}

// ---------- load ----------
const data = [];
for (const L of LOCS) {
  const { json, stale } = await fetchTimes(L.id);
  if (json) data.push({ loc: L, json, stale, list: prayerList(json) });
}

const w = new ListWidget();

if (!data.length) {
  const t = w.addText("Couldn't load prayer times.");
  t.font = Font.systemFont(12);
} else if (config.runsInAccessoryWidget) {
  // ----- lock screen: IOK only -----
  const d0 = data.find(d => d.loc.id === "iok") || data[0];
  const next = nextPrayerName(d0.list);
  const fam = config.widgetFamily || "";
  if (fam === "accessoryCircular") {
    const p = d0.list.find(x => x.name === next);
    const n = w.addText(p.name); n.font = Font.systemFont(10);
    const t = w.addText(p.iqamah || p.azan); t.font = Font.boldSystemFont(14);
  } else if (fam === "accessoryInline") {
    const p = d0.list.find(x => x.name === next);
    const t = w.addText(`Next: ${p.name} ${p.azan}${p.iqamah ? "→" + p.iqamah : ""}`);
    t.font = Font.systemFont(13);
  } else {
    // rectangular (~half the lock screen row): 2 columns x 3 rows
    const cols = w.addStack(); cols.layoutHorizontally();
    [d0.list.slice(0, 3), d0.list.slice(3, 6)].forEach((colPrayers, ci) => {
      if (ci > 0) cols.addSpacer();
      const col = cols.addStack(); col.layoutVertically();
      colPrayers.forEach(p => {
        const nm = col.addText(p.name);
        nm.font = Font.systemFont(9);
        const tm = col.addText(p.iqamah ? `${p.azan}→${p.iqamah}` : p.azan);
        tm.font = p.name === next ? Font.boldSystemFont(11) : Font.systemFont(11);
      });
    });
  }
} else {
  // ----- home screen: prayer rows, shared azan, iqamah per masjid -----
  w.backgroundColor = new Color("#14141a");
  const stale = data.some(d => d.stale);
  const head = w.addText(`🕌 Prayer Times · ${dayShort}${stale ? " · offline" : ""}`);
  head.font = Font.semiboldSystemFont(12);
  head.textColor = Color.white();
  w.addSpacer(6);

  const base = data.find(d => d.loc.id === "iok") || data[0];
  const other = data.find(d => d !== base);
  const omap = {};
  if (other) for (const p of other.list) omap[p.name] = p;
  const next = nextPrayerName(base.list);

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
        t.font = Font.systemFont(10);
        t.textColor = new Color("#9aa0b4");
      } else {
        t.font = isNext ? Font.boldSystemFont(12) : Font.systemFont(12);
        t.textColor = isNext ? new Color("#7ee2a8") : (i === 0 ? new Color("#c9cddb") : Color.white());
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
    for (const p of d.list) iqNow[p.name] = p.iqamah;
    const a = announcementLine(txt, d.loc.name, azanNow, iqNow);
    if (!a) continue;
    w.addSpacer(5);
    const f = w.addText(a.text);
    f.font = Font.systemFont(10.5);
    f.textColor = new Color("#e8c46a");
    f.lineLimit = a.lines;
    f.minimumScaleFactor = 0.85;
  }

  const rn = new Date(); rn.setDate(rn.getDate() + 1); rn.setHours(2, 30, 0, 0);
  w.refreshAfterDate = rn; // refresh overnight, daily
}

if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
