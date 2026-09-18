// Prayer widget loader — paste once into Scriptable, never touch it again.
// Fetches the latest prayer-widget.js from GitHub at most once a day,
// caches it on-device, and runs the cached copy if offline or the fetch fails.
// The widget script itself needs no changes.
const REMOTE = "https://raw.githubusercontent.com/sameer095k/iok-prayer-widget/main/prayer-widget.js";
const fm = FileManager.local();
const dir = fm.documentsDirectory();
const codePath = fm.joinPath(dir, "prayer-widget-code.js");
const stampPath = fm.joinPath(dir, "prayer-widget-stamp.txt");
const today = new Date().toISOString().slice(0, 10);

let code = null;
if (fm.readString(stampPath) !== today) {
  try {
    const fresh = await new Request(REMOTE).loadString();
    if (fresh && fresh.length > 5000) {
      code = fresh;
      fm.writeString(codePath, code);
      fm.writeString(stampPath, today);
    }
  } catch (e) {
    console.warn("widget update check failed: " + e);
  }
}
if (!code && fm.fileExists(codePath)) code = fm.readString(codePath);
if (!code) throw new Error("widget code unavailable — connect to the internet once to download it");

await eval(`(async()=>{
${code}
})()`);
