# CastleTech Lead Capture Dashboard

A lightweight lead capture API and admin dashboard for small businesses. The system collects website form submissions, stores them in SQLite, scores each lead, and displays follow-up status in a clean browser dashboard.

## Overview

CastleTech Lead Capture Dashboard demonstrates a full local lead-management workflow: a business website submits a lead, an Express API validates and stores it, and an admin dashboard displays the lead with priority scoring and follow-up actions.

The project is designed as a practical small-business tool and a portfolio example of frontend, backend, database, and multi-project integration.

## Screenshots

Add screenshots here:

<img width="959" height="499" alt="dashboard-main" src="https://github.com/user-attachments/assets/4520e6c5-0c0d-4741-b29e-c5af71c65e1e" />
- Dashboard lead table
- Expanded lead detail view
- Test lead form
- CG Dental form integration result

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite
- **Frontend:** HTML, CSS, JavaScript
- **Integration test:** PHP form handler from a separate CG Dental website project

## Main Features

- Capture leads through `POST /api/leads`
- Store leads in SQLite
- Validate required fields, email, and phone
- Score leads automatically
- Assign Hot, Warm, and Cold statuses
- Generate suggested follow-up actions
- Track contacted / not contacted status
- Display leads in an admin dashboard
- Filter by status and contacted state
- Sort by newest first or highest score
- Expand rows to view full lead details
- Mark leads as contacted
- Delete test leads during development
- Seed realistic demo leads
- Connect a separate PHP website form to the API for local testing

## Why It Is Useful

Small businesses often receive leads from websites, ads, social media, referrals, and phone calls. Without a central system, those leads can get buried in inboxes or handled inconsistently.

This dashboard gives a business owner or team a simple place to review, prioritize, and follow up with new opportunities.

## Project Structure

```text
backend/
  package.json
  package-lock.json
  seed-demo-leads.js
  server.js

database/
  schema.sql
  leads.db

frontend/
  app.js
  index.html
  lead-form.html
  styles.css
```

## API Endpoints

```text
GET    /health
GET    /api/leads
POST   /api/leads
PATCH  /api/leads/:id/contacted
DELETE /api/leads/:id
```

## Lead Scoring

The backend scores each lead based on how complete and actionable the submission is.

```text
Base score:                         20
Email present:                    + 15
Phone present:                    + 20
Company present:                  + 15
Message has 40+ characters:       + 20
Source is referral/paid/webinar:  + 10
Maximum score:                     100
```

Statuses:

- **Hot:** score `75` and above
- **Warm:** score `45` to `74`
- **Cold:** score below `45`

## What I Learned

- Building REST API endpoints with Express
- Connecting frontend JavaScript to a backend API
- Persisting application data with SQLite
- Designing simple lead scoring logic
- Handling validation and API errors
- Debugging PHP and local server issues
- Integrating two separate local projects without merging them
- Testing a real website form against a separate lead-management backend

## Local Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Run the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/health
```

## Open The Dashboard

Open the dashboard directly in a browser or with VS Code Live Server:

```text
frontend/index.html
```

With VS Code Live Server, the URL may look like:

```text
http://127.0.0.1:5500/frontend/index.html
```

The dashboard fetches leads from:

```text
GET http://localhost:3000/api/leads
```

## Add Demo Leads

From the `backend` folder:

```bash
npm run seed:demo
```

This inserts five realistic demo leads with mixed statuses, sources, scores, and contacted states.

## Test Lead Capture Without CG Dental

Open:

```text
frontend/lead-form.html
```

Submit the form, then refresh the dashboard.

## Test The CG Dental Integration Locally

The CG Dental website is a separate project and should remain separate from this dashboard project.

For local testing, run two servers.

Lead dashboard API:

```bash
cd backend
npm run dev
```

PHP server for the CG Dental website:

```powershell
& "C:\MAMP\bin\php\php8.3.1\php.exe" -S 127.0.0.1:8080 -t "C:\Users\caste\OneDrive\Castle Tech"
```

Open the CG Dental dental form:

```text
http://127.0.0.1:8080/CG%20Dental/dental.html
```

Submit the form and refresh the dashboard. New leads should appear with:

```text
Source: CG Dental Website
Company: CG Dental
```

Notes:

- VS Code Live Server is fine for the dashboard because it is plain HTML/CSS/JavaScript.
- The CG Dental form needs a PHP-capable server because it submits to `forms/dental-form.php`.
- Local PHP email sending may fail if SMTP is not configured, but the local test flow can still verify that leads are forwarded into the dashboard.

## Future Improvements

- Multi-tenancy for multiple businesses
- AI-generated reply suggestions
- SMS follow-up workflows
- Appointment scheduling integrations
- Lead source analytics and conversion reporting
- User authentication and role-based access
- PostgreSQL production database option
- Email provider integration for transactional email
- Deployment-ready frontend and backend hosting
