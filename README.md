# IOK Prayer Times Widget

A [Scriptable](https://scriptable.app) (iOS) widget showing azan + iqamah times for
IOK and CHESS masjids, sourced from isalaah.com.

- `prayer-widget.js` — the whole widget. Paste it into a Scriptable script.
- Home screen (medium widget): prayer rows with shared azan + iqamah per masjid,
  next prayer highlighted, overnight refresh, upcoming time-change announcements.
- Lock screen: IOK only. Rectangular = 2 cols × 3 rows; circular/inline = next prayer.

Data: `POST http://isalaah.com/loc/ca/schedule.php?p=clk&loc={iok,chess}`
