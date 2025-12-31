const { DateTime, Duration } = luxon;

// ---------- Year automation ----------
function getTargetYearUtcNow() {
    // "next new year" relative to current time in UTC
    const now = DateTime.utc();
    return now.year + 1;
}

function getTargetLocalMidnightObject(year) {
    return { year, month: 1, day: 1, hour: 0, minute: 0, second: 0 };
}

// ---------- Timezones ----------
const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : ["UTC"];

function buildEvents(targetYear) {
    const TARGET = getTargetLocalMidnightObject(targetYear);

    const items = zones
        .map((zone) => {
            const zdt = DateTime.fromObject(TARGET, { zone });
            if (!zdt.isValid) return null;

            return {
                zone,
                utcMillis: zdt.toUTC().toMillis(),
                offsetMin: zdt.offset,
            };
        })
        .filter(Boolean);

    items.sort((a, b) => a.utcMillis - b.utcMillis);
    return items;
}

function groupByMoment(items) {
    const groups = [];
    for (const it of items) {
        const last = groups[groups.length - 1];
        if (last && last.utcMillis === it.utcMillis) last.zones.push(it.zone);
        else groups.push({ utcMillis: it.utcMillis, zones: [it.zone], offsetMin: it.offsetMin });
    }
    return groups;
}

// ---------- Formatting helpers ----------
function fmtOffset(min) {
    const sign = min >= 0 ? "+" : "-";
    const abs = Math.abs(min);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return `UTC${sign}${hh}:${mm}`;
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));
}

function fmtCountdown(ms) {
    if (ms <= 0) return "—";
    return Duration.fromMillis(ms).shiftTo("hours", "minutes", "seconds").toFormat("hh:mm:ss");
}

// ---------- DOM ----------
const elFilter = document.getElementById("filter");
const elDedupe = document.getElementById("dedupe");
const elList = document.getElementById("list");
const elInfo = document.getElementById("info");
const elProgress = document.getElementById("progress");
const elPageTitle = document.getElementById("pageTitle");

// ---------- Init ----------
let targetYear = getTargetYearUtcNow();
let allItems = buildEvents(targetYear);

function syncTitles() {
    const title = `NYE ${targetYear} – Timezone Wave`;
    document.title = title;
    elPageTitle.textContent = `NYE ${targetYear} – Midnight Wave by Timezone`;
}

syncTitles();

function render() {
    // If we crossed into the target year already (in UTC), roll forward automatically
    const nowUtc = DateTime.utc();
    if (nowUtc.year >= targetYear) {
        targetYear = getTargetYearUtcNow();
        allItems = buildEvents(targetYear);
        syncTitles();
    }

    const now = nowUtc.toMillis();
    const filter = elFilter.value.trim().toLowerCase();
    const dedupe = elDedupe.checked;

    let itemsToShow = allItems;
    if (filter) itemsToShow = itemsToShow.filter((x) => x.zone.toLowerCase().includes(filter));

    let rows;
    if (dedupe) {
        rows = groupByMoment(itemsToShow).map((g) => ({
            utcMillis: g.utcMillis,
            zoneLabel: g.zones.length === 1 ? g.zones[0] : `${g.zones.length} zones`,
            zoneDetail:
                g.zones.length === 1
                    ? ""
                    : g.zones.slice(0, 8).join(", ") + (g.zones.length > 8 ? ", …" : ""),
            offsetMin: g.offsetMin,
        }));
    } else {
        rows = itemsToShow.map((x) => ({
            utcMillis: x.utcMillis,
            zoneLabel: x.zone,
            zoneDetail: "",
            offsetMin: x.offsetMin,
        }));
    }

    // Next upcoming row
    let nextIdx = rows.findIndex((r) => r.utcMillis > now);
    if (nextIdx < 0) nextIdx = rows.length - 1;

    // Progress: how many have crossed
    const crossed = rows.filter((r) => r.utcMillis <= now).length;
    const total = rows.length;

    // Next row info
    const nextRow = rows[nextIdx];
    const nextIn = nextRow ? nextRow.utcMillis - now : 0;
    const nextUtcStr = nextRow
        ? DateTime.fromMillis(nextRow.utcMillis, { zone: "utc" }).toFormat("yyyy-LL-dd HH:mm:ss 'UTC'")
        : "—";

    elProgress.textContent =
        `${crossed} / ${total} crossed into ${targetYear}. ` +
        (nextRow && nextIn > 0 ? `Next in ${fmtCountdown(nextIn)} (${nextUtcStr}).` : "");

    elInfo.textContent =
        `Showing ${rows.length} ${dedupe ? "entries (grouped)" : "timezones"} out of ${zones.length}. ` +
        `Current UTC: ${nowUtc.toISO({ suppressMilliseconds: true })}`;

    // Render list
    elList.innerHTML = "";

    rows.forEach((r, idx) => {
        const dtUtc = DateTime.fromMillis(r.utcMillis, { zone: "utc" });
        const diff = r.utcMillis - now;

        const el = document.createElement("div");
        el.className = "row";
        if (diff <= 0) el.classList.add("done");
        if (idx === nextIdx && diff > 0) el.classList.add("next");

        const localInBerlin = dtUtc.setZone("Europe/Berlin").toFormat("yyyy-LL-dd HH:mm:ss 'Berlin'");
        const utcStr = dtUtc.toFormat("yyyy-LL-dd HH:mm:ss 'UTC'");
        const countdown = diff > 0 ? fmtCountdown(diff) : "—";

        el.innerHTML = `
      <div class="zone">${idx + 1}. ${escapeHtml(r.zoneLabel)}</div>
      <div class="meta">${fmtOffset(r.offsetMin)} • ${utcStr} • ${localInBerlin}</div>
      <div class="count">${diff > 0 ? "in " + countdown : "passed"}</div>
    `;

        if (r.zoneDetail) {
            const detail = document.createElement("div");
            detail.className = "small";
            detail.style.marginLeft = "18px";
            detail.textContent = r.zoneDetail;

            const wrap = document.createElement("div");
            wrap.style.width = "100%";
            wrap.appendChild(el);
            wrap.appendChild(detail);
            elList.appendChild(wrap);
        } else {
            elList.appendChild(el);
        }
    });
}

elFilter.addEventListener("input", render);
elDedupe.addEventListener("change", render);

render();
setInterval(render, 1000);
