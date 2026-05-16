const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, "..", "database", "leads.db");
const SCHEMA_PATH = path.join(__dirname, "..", "database", "schema.sql");
const DATABASE_DIR = path.dirname(DATABASE_PATH);

fs.mkdirSync(DATABASE_DIR, { recursive: true });

const db = new sqlite3.Database(DATABASE_PATH, (error) => {
  if (error) {
    console.error("Unable to connect to SQLite database:", error.message);
    process.exit(1);
  }
});

app.use(cors());
app.use(express.json());

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleResult(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function normalizeContacted(value) {
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  return null;
}

function parseLeadId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function scoreLead(lead) {
  let score = 20;

  if (lead.email) score += 15;
  if (lead.phone) score += 20;
  if (lead.company) score += 15;
  if (lead.message.length >= 40) score += 20;
  if (["referral", "paid", "webinar"].includes(lead.source.toLowerCase())) score += 10;

  return Math.min(score, 100);
}

function statusForScore(score) {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

function actionForStatus(status) {
  if (status === "Hot") return "Call within 1 business day.";
  if (status === "Warm") return "Send a personalized follow-up email.";
  return "Add to nurture sequence.";
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

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "lead-capture-dashboard-api",
    databasePath: DATABASE_PATH,
  });
});

app.get("/api/leads", async (req, res) => {
  try {
    const leads = await all("SELECT * FROM leads ORDER BY datetime(created_at) DESC, id DESC");
    res.json({ leads });
  } catch (error) {
    console.error("Unable to load leads:", error.message);
    res.status(500).json({ message: "Unable to load leads." });
  }
});

app.post("/api/leads", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).json({ message: "Lead submission cannot be empty." });
    return;
  }

  const lead = {
    name: cleanString(req.body.name),
    email: cleanString(req.body.email),
    phone: cleanString(req.body.phone),
    company: cleanString(req.body.company),
    message: cleanString(req.body.message),
    source: cleanString(req.body.source),
  };

  const missingFields = [];
  if (!lead.name) missingFields.push("name");
  if (!lead.email) missingFields.push("email");

  if (missingFields.length > 0) {
    res.status(400).json({
      message: "Missing required lead fields.",
      required: missingFields,
    });
    return;
  }

  const errors = [];
  if (!isValidEmail(lead.email)) {
    errors.push("email must be a valid email address");
  }

  if (lead.phone && !isValidPhone(lead.phone)) {
    errors.push("phone must contain 7 to 15 digits");
  }

  if (errors.length > 0) {
    res.status(400).json({
      message: "Invalid lead submission.",
      errors,
    });
    return;
  }

  const score = scoreLead(lead);
  const status = statusForScore(score);
  const suggestedAction = actionForStatus(status);

  try {
    const result = await run(
      `INSERT INTO leads
        (name, email, phone, company, message, score, status, suggested_action, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.message,
        score,
        status,
        suggestedAction,
        lead.source,
      ]
    );

    const savedLead = await get("SELECT * FROM leads WHERE id = ?", [result.id]);
    res.status(201).json({ lead: savedLead });
  } catch (error) {
    console.error("Unable to save lead:", error.message);
    res.status(500).json({ message: "Unable to save lead." });
  }
});

app.patch("/api/leads/:id/contacted", async (req, res) => {
  const id = parseLeadId(req.params.id);
  const contacted = normalizeContacted(req.body?.contacted);

  if (!id) {
    res.status(400).json({ message: "Lead id must be a positive integer." });
    return;
  }

  if (contacted === null) {
    res.status(400).json({ message: "contacted must be true, false, 1, or 0." });
    return;
  }

  try {
    const result = await run(
      "UPDATE leads SET contacted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [contacted, id]
    );

    if (result.changes === 0) {
      res.status(404).json({ message: "Lead not found." });
      return;
    }

    const updatedLead = await get("SELECT * FROM leads WHERE id = ?", [id]);
    res.json({ lead: updatedLead });
  } catch (error) {
    console.error("Unable to update lead contacted status:", error.message);
    res.status(500).json({ message: "Unable to update lead contacted status." });
  }
});

app.delete("/api/leads/:id", async (req, res) => {
  const id = parseLeadId(req.params.id);

  if (!id) {
    res.status(400).json({ message: "Lead id must be a positive integer." });
    return;
  }

  try {
    const result = await run("DELETE FROM leads WHERE id = ?", [id]);

    if (result.changes === 0) {
      res.status(404).json({ message: "Lead not found." });
      return;
    }

    res.json({ message: "Lead deleted.", id });
  } catch (error) {
    console.error("Unable to delete lead:", error.message);
    res.status(500).json({ message: "Unable to delete lead." });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Lead dashboard API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize database:", error.message);
    process.exit(1);
  });
