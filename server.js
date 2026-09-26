const express = require("express");
const africastalking = require("africastalking");
const localtunnel = require("localtunnel");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const reports = [];
const oneHourInMilliseconds = 60 * 60 * 1000;

const africaTalking = africastalking({
  username: process.env.AT_USERNAME,
  apiKey: process.env.AT_API_KEY,
});
const sms = africaTalking.SMS;
let tunnel;

// Send an SMS reply to the person who submitted the report.
async function sendReply(phoneNumber, message) {
  try {
    await sms.send({
      to: [phoneNumber],
      message,
    });
  } catch (error) {
    console.error("Could not send SMS reply:", error.message);
  }
}

function getRecentReports() {
  const cutoffTime = Date.now() - oneHourInMilliseconds;
  return reports.filter((report) => report.timestamp >= cutoffTime);
}

function countReportsForLga(lga) {
  const normalizedLga = lga.toLowerCase();
  return getRecentReports().filter(
    (report) => report.lga.toLowerCase() === normalizedLga,
  ).length;
}

function recordReport(lga, from, source) {
  reports.push({
    lga,
    from,
    timestamp: Date.now(),
    source,
  });

  return countReportsForLga(lga);
}

const ussdLgas = ["Kano Municipal", "Nassarawa", "Fagge"];

function getUssdLgaMenu() {
  return ussdLgas.map((lga, index) => `${index + 1}. ${lga}`).join("\n");
}

app.use(express.urlencoded({ extended: false }));

// Serve the static landing page that introduces the app and explains how to try it.
app.get("/", (request, response) => {
  response.send(`<!doctype html>
<!--
  PLACEHOLDERS TO FILL IN BEFORE SUNDAY:
  - Replace <AT_SANDBOX_SHORTCODE> with the Africa's Talking sandbox shortcode.
  - Replace the planned-feature placeholder with the final planned features list.
-->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Network Outage Reporter</title>
  <style>
    /* Keep the page self-contained: these styles need no external assets. */
    :root {
      color-scheme: dark;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #e8f1f7;
      background: #081725;
    }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      background:
        radial-gradient(ellipse at 15% 0%, rgba(30, 115, 126, 0.2), transparent 42%),
        linear-gradient(145deg, #081725, #0b2030 58%, #102d38);
    }
    main {
      width: min(calc(100% - 2rem), 860px);
      margin: 0 auto;
      padding: clamp(2rem, 8vw, 5.5rem) 0;
    }
    .hero, .status, .instructions { border-radius: 20px; }
    .hero {
      padding: clamp(2rem, 7vw, 4rem);
      background: linear-gradient(135deg, #14354a, #10283b 68%, #123d43);
      border: 1px solid rgba(190, 225, 231, 0.16);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
    }
    .hero h1 {
      max-width: 680px;
      margin: 0;
      color: #f4f8fb;
      font-size: clamp(2.25rem, 8vw, 4.25rem);
      line-height: 1.08;
      letter-spacing: -0.045em;
    }
    .hero p {
      max-width: 620px;
      margin: 1.25rem 0 0;
      color: #c5d7e1;
      font-size: clamp(1.05rem, 2.8vw, 1.2rem);
      line-height: 1.75;
    }
    .button {
      display: inline-block;
      margin-top: 1.75rem;
      padding: 0.95rem 1.4rem;
      border: 1px solid #f6d77c;
      border-radius: 12px;
      background: #f6d77c;
      color: #172b36;
      font-weight: 700;
      text-decoration: none;
      transition: background-color 160ms ease, transform 160ms ease;
    }
    .button:hover {
      background: #ffe69b;
      transform: translateY(-2px);
    }
    .button:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 4px;
    }
    .status {
      margin-top: 1.25rem;
      padding: clamp(1.5rem, 5vw, 2.25rem);
      background: rgba(14, 34, 49, 0.82);
      border: 1px solid rgba(130, 198, 193, 0.38);
      box-shadow: 0 14px 38px rgba(0, 0, 0, 0.14);
    }
    .status h2 {
      margin: 0 0 1rem;
      color: #aee2d7;
      font-size: 1.4rem;
    }
    .status p {
      margin: 0.65rem 0 0;
      color: #d2e0e7;
      line-height: 1.7;
    }
    .instructions {
      margin: 1.25rem 0 0;
      padding: clamp(1.25rem, 4vw, 1.75rem);
      background: rgba(18, 57, 62, 0.72);
      border: 1px solid rgba(116, 206, 184, 0.24);
      border-left: 4px solid #71d0b9;
      color: #d8e9e7;
      line-height: 1.75;
    }
    code {
      color: #fff0b3;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.95em;
      font-weight: 650;
      overflow-wrap: anywhere;
    }
    @media (max-width: 480px) {
      main { width: min(calc(100% - 1.25rem), 860px); }
      .hero, .status, .instructions { border-radius: 16px; }
      .button { width: 100%; text-align: center; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Network Outage Reporter</h1>
      <p>An SMS-based outage reporting tool that lets people report network outages by area and see how many others reported the same area recently.</p>
      <a class="button" href="/status/page">View Live Status Board</a>
    </section>

    <section class="status">
      <h2>MVP Status</h2>
      <p>The core SMS report + reply flow is fully working.</p>
      <p>The live status board updates in real time.</p>
      <p><!-- PLACEHOLDER: replace this planned feature with the final list before Sunday. -->
        Planned but not built: multi-network filtering.
      </p>
    </section>

    <p class="instructions">
      <strong>For judges:</strong>
      Text <code>OUTAGE &lt;LGA name&gt;</code> to
      <code>&lt;AT_SANDBOX_SHORTCODE&gt;</code> to try it live.
    </p>
  </main>
</body>
</html>`);
});

// Receive an inbound Africa's Talking SMS and save valid outage reports.
app.post("/sms/inbound", async (request, response) => {
  const from = typeof request.body.from === "string" ? request.body.from.trim() : "";
  const text =
    typeof request.body.text === "string" ? request.body.text.trim() : "";
  const outageMatch = text.match(/^OUTAGE\s+(.+)$/i);

  console.log("Inbound SMS webhook received:", {
    hasSender: Boolean(from),
    validOutageFormat: Boolean(outageMatch),
  });

  if (!outageMatch || outageMatch[1].trim().length === 0) {
    await sendReply(from, "Please use the format: OUTAGE <LGA_NAME>.");
    return response.sendStatus(200);
  }

  const lga = outageMatch[1].trim();
  const reportCount = recordReport(lga, from, "sms");
  await sendReply(
    from,
    `${reportCount} reports near you in the last hour for ${lga}.`,
  );

  return response.sendStatus(200);
});

// Receive a USSD menu selection and save it in the same report list as SMS.
app.post("/ussd/inbound", (request, response) => {
  const phoneNumber =
    typeof request.body.phoneNumber === "string"
      ? request.body.phoneNumber.trim()
      : "";
  const text = typeof request.body.text === "string" ? request.body.text.trim() : "";

  console.log("Inbound USSD webhook received:", {
    hasPhoneNumber: Boolean(phoneNumber),
    hasSelection: Boolean(text),
  });

  if (text === "") {
    return response
      .type("text/plain")
      .send(`CON Select the area with a network outage:\n${getUssdLgaMenu()}`);
  }

  // This is intentionally a single-choice menu with no nested selections.
  const selectedIndex = /^\d$/.test(text) ? Number(text) - 1 : -1;
  const isInvalidSelection =
    selectedIndex < 0 ||
    selectedIndex >= ussdLgas.length;

  if (isInvalidSelection) {
    return response
      .type("text/plain")
      .send("END Invalid option. Please try again.");
  }

  const lga = ussdLgas[selectedIndex];
  const reportCount = recordReport(lga, phoneNumber, "ussd");
  console.log("USSD outage report recorded.");

  return response
    .type("text/plain")
    .send(
      `END Report recorded for ${lga}. ${reportCount} reports near you in the last hour.`,
    );
});

// Return the number of recent reports for each LGA as JSON.
app.get("/status", (request, response) => {
  const recentReports = getRecentReports();
  const lgaCounts = new Map();

  recentReports.forEach((report) => {
    const lgaKey = report.lga.toLowerCase();
    const existingEntry = lgaCounts.get(lgaKey);

    if (existingEntry) {
      existingEntry.reportsLastHour += 1;
    } else {
      lgaCounts.set(lgaKey, {
        lga: report.lga,
        reportsLastHour: 1,
      });
    }
  });

  return response.json(Array.from(lgaCounts.values()));
});

// Render a simple HTML table of recent outage reports and refresh it every 30 seconds.
app.get("/status/page", (request, response) => {
  const recentReports = getRecentReports();
  const lgaCounts = new Map();

  recentReports.forEach((report) => {
    const lgaKey = report.lga.toLowerCase();
    const existingEntry = lgaCounts.get(lgaKey);

    if (existingEntry) {
      existingEntry.reportsLastHour += 1;
    } else {
      lgaCounts.set(lgaKey, {
        lga: report.lga,
        reportsLastHour: 1,
      });
    }
  });

  const rows = Array.from(lgaCounts.values())
    .map(
      (entry) =>
        `<tr><td>${entry.lga}</td><td>${entry.reportsLastHour}</td></tr>`,
    )
    .join("");

  response.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="30">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Network outage reports</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    /* A compact dark palette keeps the live data easy to scan. */
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #e5edf7;
      background: #09111f;
    }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      padding: clamp(1.25rem, 5vw, 4rem);
      background:
        radial-gradient(ellipse at 12% 0%, rgba(35, 111, 180, 0.18), transparent 42%),
        linear-gradient(155deg, #09111f, #0c1727 58%, #101c2d);
    }
    .dashboard { width: min(100%, 980px); margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; }
    h1 {
      margin: 0;
      color: #f4f8ff;
      font-size: clamp(1.8rem, 5vw, 2.65rem);
      line-height: 1.15;
      letter-spacing: -0.035em;
    }
    p {
      margin: 0.75rem 0 0;
      color: #a9b8ca;
      font-size: clamp(0.95rem, 2.5vw, 1.05rem);
      line-height: 1.6;
    }
    .card {
      margin-top: 1.25rem;
      padding: clamp(1.15rem, 3vw, 1.75rem);
      border: 1px solid rgba(145, 171, 203, 0.2);
      border-radius: 20px;
      background: rgba(16, 29, 47, 0.94);
      box-shadow: 0 22px 55px rgba(0, 0, 0, 0.28);
    }
    .card-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .eyebrow {
      margin: 0 0 0.35rem;
      color: #7dd3fc;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    h2 {
      margin: 0;
      color: #f0f6ff;
      font-size: clamp(1.15rem, 3vw, 1.45rem);
      letter-spacing: -0.02em;
    }
    .refresh-note {
      flex: 0 0 auto;
      padding: 0.4rem 0.65rem;
      border: 1px solid rgba(125, 211, 252, 0.2);
      border-radius: 999px;
      background: rgba(14, 116, 144, 0.12);
      color: #a5dff7;
      font-size: 0.78rem;
    }
    .chart-frame {
      position: relative;
      height: clamp(270px, 42vw, 380px);
    }
    .empty-state {
      display: grid;
      min-height: 230px;
      place-items: center;
      padding: 1.5rem;
      border: 1px dashed rgba(145, 171, 203, 0.25);
      border-radius: 14px;
      background: rgba(9, 17, 31, 0.35);
      color: #a9b8ca;
      text-align: center;
    }
    .table-card { padding: 0; overflow: hidden; }
    .table-card h2 { padding: 1.25rem 1.4rem 0.9rem; }
    table {
      width: 100%;
      border-spacing: 0;
      text-align: left;
    }
    th, td {
      padding: 0.95rem 1.1rem;
      overflow-wrap: anywhere;
    }
    th {
      background: #14243a;
      color: #aebed2;
      font-size: 0.76rem;
      font-weight: 650;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    tbody td {
      border-top: 1px solid rgba(145, 171, 203, 0.13);
      color: #e3ebf5;
      font-size: 0.98rem;
    }
    tbody tr:first-child td { border-top: 0; }
    th:last-child, td:last-child {
      width: 34%;
      text-align: right;
    }
    tbody td:last-child {
      color: #7dd3fc;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    tbody tr:hover td { background: rgba(50, 91, 135, 0.16); }
    .coming-soon { margin-top: 1.75rem; }
    .coming-soon > h2 { margin-bottom: 0.85rem; color: #a9b8ca; font-size: 1rem; }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }
    .feature-card {
      padding: 1rem 1.1rem;
      border: 1px dashed rgba(145, 171, 203, 0.23);
      border-radius: 14px;
      background: rgba(16, 29, 47, 0.4);
      color: #8594a8;
    }
    .feature-card span {
      color: #748399;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }
    .feature-card h3 { margin: 0.35rem 0 0; color: #a9b6c8; font-size: 0.95rem; }
    @media (max-width: 480px) {
      body { padding: 1.25rem 0.9rem; }
      th, td { padding: 0.8rem 0.7rem; }
      th { font-size: 0.68rem; }
      tbody td { font-size: 0.92rem; }
      .card { border-radius: 16px; }
      .card-heading { flex-direction: column; gap: 0.7rem; }
      .feature-grid { grid-template-columns: 1fr; }
      .table-card h2 { padding-right: 0.9rem; padding-left: 0.9rem; }
    }
  </style>
</head>
<body>
  <main class="dashboard">
    <header class="page-header">
      <h1>Network outage reports</h1>
      <p>Reports received in the last hour. This page refreshes every 30 seconds.</p>
    </header>

    <section class="card chart-card" aria-labelledby="chart-title">
      <div class="card-heading">
        <div>
          <p class="eyebrow">Live overview</p>
          <h2 id="chart-title">Reports by LGA</h2>
        </div>
        <span class="refresh-note">Updated every 30 seconds</span>
      </div>
      <div id="chart-empty" class="empty-state" role="status" hidden>No recent reports. New outage reports will appear here.</div>
      <div id="chart-frame" class="chart-frame" hidden>
        <canvas id="report-chart" role="img" aria-label="Bar chart of reports in the last hour by LGA"></canvas>
      </div>
    </section>

    <section class="card table-card" aria-labelledby="table-title">
      <h2 id="table-title">Report details</h2>
      <table>
        <thead><tr><th>LGA</th><th>Reports in the last hour</th></tr></thead>
        <tbody>${rows || "<tr><td colspan=\"2\">No recent reports.</td></tr>"}</tbody>
      </table>
    </section>

    <section class="coming-soon" aria-labelledby="coming-soon-title">
      <h2 id="coming-soon-title">More ways to explore</h2>
      <div class="feature-grid">
        <article class="feature-card"><span>Coming soon</span><h3>Filter by time range</h3></article>
        <article class="feature-card"><span>Coming soon</span><h3>SMS vs USSD breakdown</h3></article>
      </div>
    </section>
  </main>
  <script>
    // Load chart values from the existing JSON endpoint; the page reloads every 30 seconds.
    const chartEmptyState = document.getElementById("chart-empty");
    const chartFrame = document.getElementById("chart-frame");

    async function renderReportsChart() {
      try {
        const response = await fetch("/status", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load report data.");

        const reports = await response.json();
        if (reports.length === 0) {
          chartEmptyState.hidden = false;
          chartFrame.hidden = true;
          return;
        }

        if (typeof Chart === "undefined") throw new Error("Chart library did not load.");

        chartEmptyState.hidden = true;
        chartFrame.hidden = false;

        new Chart(document.getElementById("report-chart"), {
          type: "bar",
          data: {
            labels: reports.map((entry) => entry.lga),
            datasets: [{
              label: "Reports in the last hour",
              data: reports.map((entry) => entry.reportsLastHour),
              backgroundColor: "rgba(56, 189, 248, 0.72)",
              borderColor: "#38bdf8",
              borderWidth: 1,
              borderRadius: 7,
              maxBarThickness: 56,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: "#c4d2e2", usePointStyle: true, padding: 20 } },
            },
            scales: {
              x: {
                title: { display: true, text: "LGA", color: "#a9b8ca" },
                ticks: {
                  color: "#a9b8ca",
                  autoSkip: true,
                  maxTicksLimit: 8,
                  maxRotation: 0,
                  callback(value) {
                    const label = this.getLabelForValue(value);
                    return label.length > 14 ? label.split(" ") : label;
                  },
                },
                grid: { display: false },
                border: { color: "rgba(145, 171, 203, 0.22)" },
              },
              y: {
                beginAtZero: true,
                ticks: { color: "#a9b8ca", precision: 0 },
                title: {
                  display: true,
                  text: "Reports in the last hour",
                  color: "#a9b8ca",
                },
                grid: { color: "rgba(145, 171, 203, 0.12)" },
                border: { display: false },
              },
            },
          },
        });
      } catch (error) {
        chartFrame.hidden = true;
        chartEmptyState.hidden = false;
        chartEmptyState.textContent = "Unable to load recent reports right now.";
        console.error("Could not render outage report chart:", error.message);
      }
    }

    renderReportsChart();
  </script>
</body>
</html>`);
});

const server = app.listen(port, async () => {
  console.log(`Network outage reporter listening on port ${port}`);

  if (!process.argv.includes("--tunnel")) {
    return;
  }

  try {
    tunnel = await localtunnel({
      port,
      subdomain: process.env.LOCALTUNNEL_SUBDOMAIN,
    });
    console.log(`LocalTunnel URL: ${tunnel.url}`);
    console.log(`Africa's Talking callback URL: ${tunnel.url}/sms/inbound`);

    tunnel.on("close", () => {
      console.warn("LocalTunnel connection closed.");
    });
  } catch (error) {
    console.error("Could not start LocalTunnel:", error.message);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other server or set PORT to a free port.`);
    process.exitCode = 1;
    return;
  }

  console.error("Server failed to start:", error.message);
  process.exitCode = 1;
});

async function shutDown() {
  if (tunnel) {
    tunnel.close();
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
