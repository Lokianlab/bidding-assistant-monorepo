// Pull all PCC data for 史多禮 and 臺灣吧
// Output: pcc-data-result.json

import { writeFileSync } from "fs";

const API_BASE = "https://pcc-api.openfun.app/api";

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`Non-JSON response for ${url}: ${text.slice(0, 200)}`);
    return null;
  }
}

async function fetchAllPages(endpoint, query) {
  const records = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const url = `${API_BASE}${endpoint}?query=${encodeURIComponent(query)}&page=${page}`;
    console.log(`  Fetching page ${page}/${totalPages}...`);
    const data = await fetchJSON(url);
    if (!data || !data.records) { console.error(`  Failed page ${page}`); break; }
    totalPages = data.total_pages || 1;
    records.push(...data.records);
    page++;
    await new Promise(r => setTimeout(r, 500));
  }
  return records;
}

function classifyRecord(record, companyName) {
  const nameKey = record.brief?.companies?.name_key || {};
  // Find the company in name_key (partial match)
  for (const [name, paths] of Object.entries(nameKey)) {
    if (name.includes(companyName)) {
      const joined = paths.join(",");
      if (joined.includes("未得標廠商")) return "lost";
      if (joined.includes("得標廠商")) return "won";
      // Only appears as 投標廠商 (no decision yet, or 招標公告)
      return "bid_only";
    }
  }
  return "unclear";
}

function analyzeRecords(records, companyName) {
  let won = 0, lost = 0, bidOnly = 0, unclear = 0;
  const byUnit = {};
  const byYear = {};
  const soloVsCompetitive = { solo: 0, competitive: 0, byCount: {} };
  const repeatClients = {}; // unit_name → won count

  const classified = records.map(r => {
    const status = classifyRecord(r, companyName);
    if (status === "won") won++;
    else if (status === "lost") lost++;
    else if (status === "bid_only") bidOnly++;
    else unclear++;

    const unit = r.unit_name || "unknown";
    const dateStr = String(r.date || "");
    const year = dateStr.slice(0, 4);
    const title = r.brief?.title || "";
    const type = r.brief?.type || "";
    const numCompanies = r.brief?.companies?.names?.length || 1;

    // By unit
    if (!byUnit[unit]) byUnit[unit] = { total: 0, won: 0, lost: 0 };
    byUnit[unit].total++;
    if (status === "won") byUnit[unit].won++;
    if (status === "lost") byUnit[unit].lost++;

    // By year
    if (year) {
      if (!byYear[year]) byYear[year] = { total: 0, won: 0, lost: 0 };
      byYear[year].total++;
      if (status === "won") byYear[year].won++;
      if (status === "lost") byYear[year].lost++;
    }

    // Solo vs competitive
    if (numCompanies === 1) soloVsCompetitive.solo++;
    else soloVsCompetitive.competitive++;
    const countKey = String(numCompanies);
    if (!soloVsCompetitive.byCount[countKey]) soloVsCompetitive.byCount[countKey] = { total: 0, won: 0 };
    soloVsCompetitive.byCount[countKey].total++;
    if (status === "won") soloVsCompetitive.byCount[countKey].won++;

    // Repeat clients
    if (status === "won") {
      repeatClients[unit] = (repeatClients[unit] || 0) + 1;
    }

    return {
      date: r.date,
      unit_id: r.unit_id,
      unit_name: unit,
      job_number: r.job_number,
      title,
      type,
      status,
      numCompanies,
      competitors: (r.brief?.companies?.names || []).filter(n => !n.includes(companyName)),
    };
  });

  const decided = won + lost;
  return {
    total: records.length,
    won, lost, bidOnly, unclear,
    winRate: decided > 0 ? (won / decided) : 0,
    byUnit,
    byYear,
    soloVsCompetitive,
    repeatClients,
    classified,
  };
}

async function getMarketSize(keyword) {
  const url = `${API_BASE}/searchbytitle?query=${encodeURIComponent(keyword)}&page=1`;
  const data = await fetchJSON(url);
  if (!data) return { keyword, total: 0 };
  return { keyword, total: data.total_records || 0 };
}

async function main() {
  console.log("=== 1. Pulling 史多禮 bidding records ===");
  const storyRecords = await fetchAllPages("/searchbycompanyname", "史多禮");
  console.log(`  Total: ${storyRecords.length} records`);
  const story = analyzeRecords(storyRecords, "史多禮");
  console.log(`  Won: ${story.won}, Lost: ${story.lost}, BidOnly: ${story.bidOnly}, WinRate: ${(story.winRate * 100).toFixed(1)}%`);

  console.log("\n=== 2. Pulling 臺灣各種吧 bidding records ===");
  const barRecords = await fetchAllPages("/searchbycompanyname", "臺灣各種吧");
  console.log(`  Total: ${barRecords.length} records`);
  const bar = analyzeRecords(barRecords, "臺灣各種吧");
  console.log(`  Won: ${bar.won}, Lost: ${bar.lost}, BidOnly: ${bar.bidOnly}, WinRate: ${(bar.winRate * 100).toFixed(1)}%`);

  console.log("\n=== 3. Market size queries ===");
  const keywords = ["文史", "策展", "出版品", "文化刊物", "走讀", "數位體驗", "導覽", "文化推廣", "動畫", "歷史教育"];
  const marketSizes = [];
  for (const kw of keywords) {
    const r = await getMarketSize(kw);
    console.log(`  ${kw}: ${r.total}`);
    marketSizes.push(r);
    await new Promise(r => setTimeout(r, 300));
  }

  const result = { timestamp: new Date().toISOString(), story, bar, marketSizes };
  writeFileSync("pcc-data-result.json", JSON.stringify(result, null, 2), "utf-8");
  console.log("\n=== Done! Written to pcc-data-result.json ===");
}

main().catch(e => { console.error(e); process.exit(1); });
