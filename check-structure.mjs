const API_BASE = "https://pcc-api.openfun.app/api";

async function main() {
  // Check 1: Does searchbycompanyname include lost records?
  const res1 = await fetch(`${API_BASE}/searchbycompanyname?query=史多禮&page=2`, {
    headers: { Accept: "application/json" },
  });
  const data1 = await res1.json();
  console.log("=== Page 2 sample records ===");
  for (let i = 0; i < Math.min(5, data1.records.length); i++) {
    const r = data1.records[i];
    const nameKey = r.brief?.companies?.name_key || {};
    const storyKeys = nameKey["史多禮股份有限公司"] || [];
    console.log(`${r.date} | ${r.brief?.type} | ${r.brief?.title?.slice(0, 40)} | keys: ${storyKeys.join(", ")}`);
  }

  // Check 2: searchbytitle response
  console.log("\n=== searchbytitle test ===");
  const res2 = await fetch(`${API_BASE}/searchbytitle?query=策展&page=1`, {
    headers: { Accept: "application/json" },
  });
  const text2 = await res2.text();
  console.log("Response type:", res2.headers.get("content-type"));
  console.log("Response length:", text2.length);
  console.log("First 500 chars:", text2.slice(0, 500));

  // Check 3: Does searchbyaward return different count?
  console.log("\n=== searchbyaward for 史多禮 ===");
  const res3 = await fetch(`${API_BASE}/searchbyaward?query=史多禮&page=1`, {
    headers: { Accept: "application/json" },
  });
  const text3 = await res3.text();
  try {
    const data3 = JSON.parse(text3);
    console.log("Total:", data3.total, "Pages:", data3.total_pages);
  } catch {
    console.log("Non-JSON, first 300:", text3.slice(0, 300));
  }
}

main().catch(console.error);
