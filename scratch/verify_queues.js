// Verify queue consistency: date page total = sum of time page slots
// Uses Playwright snapshots with correct parsing
const { execSync } = require("child_process");
const fs = require("fs");

const BRANCHES = [1, 2, 3, 4];
const TEST_DATES = [];

const now = new Date();
for (let i = 0; i < 3; i++) {
  const d = new Date(now);
  d.setDate(d.getDate() + i);
  TEST_DATES.push(d.toISOString().slice(0, 10));
}

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd: process.cwd() }).trim();
}

function parseDateSnapshot(yaml, date) {
  const lines = yaml.split("\n");
  // Find the block: link line, then /url line with date, then look for คิว/คิวเต็ม/วันหยุด
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("/url:") && lines[i].includes(`date=${date}`)) {
      // Search nearby lines (within 10 lines before this URL) for the link and after for queue info
      // The link is just above, queue info is below
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const qm = lines[j].match(/ว่าง\s+(\d+)\s+คิว/);
        if (qm) return parseInt(qm[1]);
        if (lines[j].includes("คิวเต็ม")) return 0;
        if (lines[j].includes("วันหยุด")) return -1;
        // If we hit another link, stop
        if (lines[j].includes("link ") && j > i + 1) break;
      }
    }
  }
  return null;
}

function parseTimeSnapshot(yaml) {
  const lines = yaml.split("\n");
  let total = 0;
  for (const line of lines) {
    // Only match link lines that have "ท่าน" to avoid double counting
    if (!line.trim().startsWith("- link")) continue;
    const m = line.match(/ว่าง\s+(\d+)\s+ท่าน/);
    if (m) total += parseInt(m[1]);
  }
  return total;
}

async function main() {
  run(`playwright-cli open "http://localhost:3001/booking"`);

  const results = [];
  let allPassed = true;

  for (const branchId of BRANCHES) {
    for (const date of TEST_DATES) {
      run(`playwright-cli goto "http://localhost:3001/booking/date?branch=${branchId}&date=${date}"`);
      run(`playwright-cli snapshot --filename=_test_date.yaml`);
      const dateYaml = fs.readFileSync("_test_date.yaml", "utf-8");
      const dateQueues = parseDateSnapshot(dateYaml, date);

      if (dateQueues === null) {
        results.push({ branch: branchId, date, status: "SKIP", dateQueues: "N/A", timeTotal: "N/A" });
        continue;
      }
      if (dateQueues === -1) {
        results.push({ branch: branchId, date, status: "DATEOFF", dateQueues: "วันหยุด", timeTotal: "-" });
        continue;
      }

      run(`playwright-cli goto "http://localhost:3001/booking/time?branch=${branchId}&date=${date}"`);
      run(`playwright-cli snapshot --filename=_test_time.yaml`);
      const timeYaml = fs.readFileSync("_test_time.yaml", "utf-8");
      const timeTotal = parseTimeSnapshot(timeYaml);

      const match = dateQueues === timeTotal;
      if (!match) allPassed = false;

      results.push({ branch: branchId, date, status: match ? "PASS" : "FAIL", dateQueues, timeTotal });
    }
  }

  run("playwright-cli close");
  try { fs.unlinkSync("_test_date.yaml"); fs.unlinkSync("_test_time.yaml"); fs.unlinkSync("_dbg_date.yaml"); fs.unlinkSync("_dbg_time.yaml"); } catch {}

  console.log("\n=== Queue Consistency Test ===\n");
  console.log("Branch | Date       | Status  | Date(คิว) | Time(sum)");
  console.log("-------|------------|---------|-----------|----------");
  for (const r of results) {
    console.log(`  ${r.branch}    | ${r.date} | ${String(r.status).padEnd(7)} | ${String(r.dateQueues).padEnd(9)} | ${r.timeTotal}`);
  }
  console.log(`\n${allPassed ? "✅ ALL PASSED" : "❌ SOME FAILED"}\n`);
}

main().catch(console.error);
