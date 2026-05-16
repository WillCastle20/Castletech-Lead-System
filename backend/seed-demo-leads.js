const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DATABASE_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, "..", "database", "leads.db");
const SCHEMA_PATH = path.join(__dirname, "..", "database", "schema.sql");

const demoLeads = [
  {
    name: "Alicia Morgan",
    email: "alicia.morgan@example.com",
    phone: "312-555-0148",
    company: "Morgan Dental Group",
    message: "Looking for a lead capture system this month with call tracking and fast follow-up.",
    score: 95,
    status: "Hot",
    suggested_action: "Call within 1 business day.",
    contacted: 0,
    source: "Website",
  },
  {
    name: "Marcus Bennett",
    email: "marcus.bennett@example.com",
    phone: "404-555-0191",
    company: "Bennett Roofing",
    message: "Asked about pricing after seeing a campaign offer.",
    score: 82,
    status: "Hot",
    suggested_action: "Call within 1 business day.",
    contacted: 1,
    source: "Google Ads",
  },
  {
    name: "Priya Shah",
    email: "priya.shah@example.com",
    phone: "646-555-0172",
    company: "Shah Wellness Studio",
    message: "Interested in improving lead response times for new client inquiries.",
    score: 63,
    status: "Warm",
    suggested_action: "Send a personalized follow-up email.",
    contacted: 0,
    source: "Instagram",
  },
  {
    name: "Daniel Ruiz",
    email: "daniel.ruiz@example.com",
    phone: "210-555-0186",
    company: "Ruiz Auto Repair",
    message: "Requested more information but did not mention a timeline.",
    score: 48,
    status: "Warm",
    suggested_action: "Send a personalized follow-up email.",
    contacted: 1,
    source: "Facebook",
  },
  {
    name: "Evelyn Carter",
    email: "evelyn.carter@example.com",
    phone: "602-555-0133",
    company: "",
    message: "Called to ask a general question about services.",
    score: 28,
    status: "Cold",
    suggested_action: "Add to nurture sequence.",
    contacted: 0,
    source: "Phone Call",
  },
];

const db = new sqlite3.Database(DATABASE_PATH, (error) => {
  if (error) {
    console.error("Unable to connect to SQLite database:", error.message);
    process.exit(1);
  }
});

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleResult(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function initializeDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  await exec(schema);

  const columns = await all("PRAGMA table_info(leads)");
  const columnNames = columns.map((column) => column.name);

  if (!columnNames.includes("suggested_action")) {
    await run("ALTER TABLE leads ADD COLUMN suggested_action TEXT");
  }

  if (!columnNames.includes("contacted")) {
    await run("ALTER TABLE leads ADD COLUMN contacted INTEGER DEFAULT 0");
  }
}

async function seedDemoLeads() {
  await initializeDatabase();

  const emails = demoLeads.map((lead) => lead.email);
  await run(
    `DELETE FROM leads WHERE email IN (${emails.map(() => "?").join(", ")})`,
    emails
  );

  for (const lead of demoLeads) {
    await run(
      `INSERT INTO leads
        (name, email, phone, company, message, score, status, suggested_action, contacted, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.message,
        lead.score,
        lead.status,
        lead.suggested_action,
        lead.contacted,
        lead.source,
      ]
    );
  }

  console.log(`Inserted ${demoLeads.length} demo leads into ${DATABASE_PATH}`);
}

seedDemoLeads()
  .catch((error) => {
    console.error("Unable to seed demo leads:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
