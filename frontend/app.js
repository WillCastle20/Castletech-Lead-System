const API_BASE_URL = "http://localhost:3000";

const stateMessage = document.querySelector("#lead-state");
const tableWrap = document.querySelector("#lead-table-wrap");
const tableBody = document.querySelector("#lead-table-body");
const refreshButton = document.querySelector("#refresh-leads");
const filterButtons = document.querySelectorAll(".filter-button");
const sortSelect = document.querySelector("#sort-leads");
const totalLeadsCount = document.querySelector("#total-leads-count");
const hotLeadsCount = document.querySelector("#hot-leads-count");
const followUpCount = document.querySelector("#follow-up-count");
const leadCountLabel = document.querySelector("#lead-count-label");

let leads = [];
let activeFilter = "all";
let activeSort = "newest";
let expandedLeadId = null;

function setState(message, type = "default") {
  stateMessage.textContent = message;
  stateMessage.classList.toggle("error", type === "error");
  stateMessage.hidden = false;
  tableWrap.hidden = true;
}

function clearState() {
  stateMessage.hidden = true;
  tableWrap.hidden = false;
}

function formatValue(value) {
  return value ? value : "-";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatDetailValue(value) {
  return value === null || value === undefined || value === "" ? "Not provided" : value;
}

function badgeClassForStatus(status) {
  if (status === "Hot") return "badge-hot";
  if (status === "Warm") return "badge-warm";
  return "badge-cold";
}

function applyFilter(lead) {
  if (activeFilter === "all") return true;
  if (activeFilter === "contacted") return Number(lead.contacted) === 1;
  if (activeFilter === "not-contacted") return Number(lead.contacted) !== 1;
  return lead.status === activeFilter;
}

function sortLeads(currentLeads) {
  return [...currentLeads].sort((a, b) => {
    if (activeSort === "score") {
      return Number(b.score || 0) - Number(a.score || 0);
    }

    const dateA = new Date(a.created_at).getTime() || 0;
    const dateB = new Date(b.created_at).getTime() || 0;
    return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
  });
}

function updateSummary() {
  const total = leads.length;
  const hot = leads.filter((lead) => lead.status === "Hot").length;
  const needsFollowUp = leads.filter((lead) => Number(lead.contacted) !== 1).length;

  totalLeadsCount.textContent = total;
  hotLeadsCount.textContent = hot;
  followUpCount.textContent = needsFollowUp;
}

function updateLeadCountLabel(visibleCount) {
  const total = leads.length;

  if (total === 0) {
    leadCountLabel.textContent = "No leads loaded";
    return;
  }

  leadCountLabel.textContent = `${visibleCount} of ${total} leads shown`;
}

function appendCell(row, value, className) {
  const cell = document.createElement("td");
  cell.textContent = value;

  if (className) {
    cell.className = className;
  }

  row.appendChild(cell);
  return cell;
}

function appendBadgeCell(row, text, className) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  cell.appendChild(badge);
  row.appendChild(cell);
}

function renderTable() {
  updateSummary();

  const visibleLeads = sortLeads(leads.filter(applyFilter));
  updateLeadCountLabel(visibleLeads.length);
  tableBody.textContent = "";

  if (leads.length === 0) {
    setState("No leads have been captured yet.");
    return;
  }

  if (visibleLeads.length === 0) {
    setState("No leads match the selected filter.");
    return;
  }

  clearState();

  visibleLeads.forEach((lead) => {
    const row = document.createElement("tr");
    row.className = "lead-row";
    row.tabIndex = 0;
    row.setAttribute("aria-expanded", String(expandedLeadId === lead.id));
    const contacted = Number(lead.contacted) === 1;

    if (expandedLeadId === lead.id) {
      row.classList.add("expanded");
    }

    const nameCell = appendCell(row, "", "name-cell");
    const leadName = document.createElement("span");
    leadName.className = "lead-name";
    leadName.textContent = formatValue(lead.name);
    const detailHint = document.createElement("span");
    detailHint.className = "detail-hint";
    detailHint.textContent = expandedLeadId === lead.id ? "Click to collapse" : "Click for details";
    nameCell.append(leadName, detailHint);

    appendCell(row, formatValue(lead.phone), lead.phone ? "" : "muted");
    appendCell(row, formatValue(lead.email));
    appendCell(row, formatValue(lead.company), lead.company ? "" : "muted");
    appendCell(row, formatValue(lead.source), lead.source ? "" : "muted");
    appendCell(row, String(lead.score ?? 0));
    appendBadgeCell(row, lead.status || "Cold", badgeClassForStatus(lead.status));
    appendCell(row, formatValue(lead.suggested_action), lead.suggested_action ? "" : "muted");
    appendBadgeCell(
      row,
      contacted ? "Contacted" : "Not Contacted",
      contacted ? "contacted-pill" : "not-contacted-pill"
    );
    appendCell(row, formatDate(lead.created_at));

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "actions";

    const detailButton = document.createElement("button");
    detailButton.type = "button";
    detailButton.className = "secondary-action";
    detailButton.textContent = expandedLeadId === lead.id ? "Hide Details" : "View Details";
    detailButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLeadDetails(lead.id);
    });

    const contactedButton = document.createElement("button");
    contactedButton.type = "button";
    contactedButton.textContent = contacted ? "Contacted" : "Mark Contacted";
    contactedButton.disabled = contacted;
    contactedButton.addEventListener("click", (event) => {
      event.stopPropagation();
      markContacted(lead.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteLead(lead.id);
    });

    actions.append(detailButton, contactedButton, deleteButton);
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    row.addEventListener("click", () => toggleLeadDetails(lead.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleLeadDetails(lead.id);
      }
    });

    tableBody.appendChild(row);

    if (expandedLeadId === lead.id) {
      tableBody.appendChild(createDetailRow(lead));
    }
  });
}

function toggleLeadDetails(id) {
  expandedLeadId = expandedLeadId === id ? null : id;
  renderTable();
}

function createDetailRow(lead) {
  const row = document.createElement("tr");
  row.className = "detail-row";

  const cell = document.createElement("td");
  cell.colSpan = 11;

  const detailPanel = document.createElement("div");
  detailPanel.className = "detail-panel";

  const leadOverview = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = lead.name || "Lead Details";

  const detailGrid = document.createElement("div");
  detailGrid.className = "detail-grid";

  [
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.company],
    ["Source", lead.source],
    ["Score", lead.score ?? 0],
    ["Status", lead.status],
    ["Contacted", Number(lead.contacted) === 1 ? "Yes" : "No"],
    ["Created", formatDate(lead.created_at)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "detail-item";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = formatDetailValue(value);

    item.append(labelElement, valueElement);
    detailGrid.appendChild(item);
  });

  leadOverview.append(title, detailGrid);

  const messagePanel = document.createElement("div");
  const actionTitle = document.createElement("h4");
  actionTitle.textContent = "Suggested Action";
  const actionText = document.createElement("p");
  actionText.className = "lead-message";
  actionText.textContent = formatDetailValue(lead.suggested_action);

  const messageTitle = document.createElement("h4");
  messageTitle.textContent = "Full Message";
  messageTitle.style.marginTop = "14px";
  const messageText = document.createElement("p");
  messageText.className = "lead-message";
  messageText.textContent = formatDetailValue(lead.message);

  messagePanel.append(actionTitle, actionText, messageTitle, messageText);
  detailPanel.append(leadOverview, messagePanel);
  cell.appendChild(detailPanel);
  row.appendChild(cell);

  return row;
}

async function loadLeads() {
  setState("Loading leads...");

  try {
    const response = await fetch(`${API_BASE_URL}/api/leads`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load leads.");
    }

    leads = Array.isArray(data.leads) ? data.leads : [];
    renderTable();
  } catch (error) {
    leads = [];
    updateSummary();
    updateLeadCountLabel(0);
    setState("Unable to load leads. Start the backend and try again.", "error");
  }
}

async function markContacted(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}/contacted`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contacted: true }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update lead.");
    }

    leads = leads.map((lead) => (lead.id === id ? data.lead : lead));
    expandedLeadId = data.lead.id;
    renderTable();
  } catch (error) {
    setState("Unable to mark lead as contacted. Try again.", "error");
  }
}

async function deleteLead(id) {
  const confirmed = window.confirm("Delete this lead?");
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete lead.");
    }

    leads = leads.filter((lead) => lead.id !== id);
    if (expandedLeadId === id) {
      expandedLeadId = null;
    }
    renderTable();
  } catch (error) {
    setState("Unable to delete lead. Try again.", "error");
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach((currentButton) => {
      currentButton.classList.toggle("active", currentButton === button);
    });

    if (!leads.some(applyFilter)) {
      expandedLeadId = null;
    }

    renderTable();
  });
});

sortSelect.addEventListener("change", () => {
  activeSort = sortSelect.value;
  renderTable();
});

refreshButton.addEventListener("click", loadLeads);

loadLeads();
