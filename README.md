# IOK Prayer Times Widget

Shows IOK and CHESS masjid azan + iqamah times right on your iPhone home screen and lock screen.

![Home screen widget](screenshot.jpg?v=2)

## Setup

1. Install [Scriptable](https://apps.apple.com/app/id1405459188) from the App Store.
2. Open Scriptable and tap **+** to create a new script.
3. Paste in the loader below, give the script a name, and save it. It downloads
   the widget code from this repo (checked at most once a day) and runs the
   cached copy the rest of the time, so it keeps working offline — you never
   have to update the script by hand.

```js
const R="https://raw.githubusercontent.com/sameer095k/iok-prayer-widget/main/prayer-widget.js",fm=FileManager.local(),d=fm.documentsDirectory(),c=fm.joinPath(d,"pwc.js"),s=fm.joinPath(d,"pws.txt"),t=new Date().toISOString().slice(0,10);let code=null;if(fm.readString(s)!==t){try{const f=await new Request(R).loadString();if(f&&f.length>5000){code=f;fm.writeString(c,code);fm.writeString(s,t)}}catch(e){}}if(!code&&fm.fileExists(c))code=fm.readString(c);if(!code)throw new Error("widget code unavailable");await eval(`(async()=>{${code}})()`);
```

4. Long-press your home screen, tap **+**, add a **Scriptable** widget, and pick
   your script. That's it.

## What it shows

- **Home screen** — prayer rows with azan + iqamah for both masjids, next prayer
  highlighted, plus any upcoming time-change announcements.
- **Lock screen** — the next upcoming prayer only.

Times come from isalaah.com.
