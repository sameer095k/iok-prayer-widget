# IOK Prayer Times Widget

A [Scriptable](https://scriptable.app) (iOS) widget showing azan + iqamah times for
IOK and CHESS masjids, sourced from isalaah.com.

- `prayer-widget.js` — the whole widget. Paste it into a Scriptable script.
- `loader.js` — recommended: a tiny auto-updating loader. Paste it into
  Scriptable once and it pulls the latest `prayer-widget.js` from this repo
  (checked at most once a day, cached on-device, works offline after the first
  fetch). The widget script itself needs no changes.
- Home screen (medium widget): prayer rows with shared azan + iqamah per masjid,
  next prayer highlighted, overnight refresh, upcoming time-change announcements.
- Lock screen: IOK only. Rectangular = 2 cols × 3 rows; circular/inline = next prayer.

Data: `POST http://isalaah.com/loc/ca/schedule.php?p=clk&loc={iok,chess}`

## Easiest setup (loader)

Paste this one line into a new Scriptable script, add it as a widget, done.
It fetches the widget code from this repo once a day and runs the cached copy
the rest of the time — you never have to update the script by hand again:

```js
const R="https://raw.githubusercontent.com/sameer095k/iok-prayer-widget/main/prayer-widget.js",fm=FileManager.local(),d=fm.documentsDirectory(),c=fm.joinPath(d,"pwc.js"),s=fm.joinPath(d,"pws.txt"),t=new Date().toISOString().slice(0,10);let code=null;if(fm.readString(s)!==t){try{const f=await new Request(R).loadString();if(f&&f.length>5000){code=f;fm.writeString(c,code);fm.writeString(s,t)}}catch(e){}}if(!code&&fm.fileExists(c))code=fm.readString(c);if(!code)throw new Error("widget code unavailable");await eval(`(async()=>{${code}})()`);
```

Prefer readable code? `loader.js` in this repo is the same thing with comments.
