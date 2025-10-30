// script.js
const db = window.db;

// --- Sections ---
const sections = ["home","advocacy","getinvolved","resources","contact","thanks"];

// --- UI helpers ---
function showSection(id) {
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    s === id ? el.classList.remove("hidden") : el.classList.add("hidden");
  });
}

function filterPlaceholder() {
  // placeholder for search; no-op for now
  return;
}

// --- Theme handling (kept from previous) ---
function applyTheme(mode) {
  const body = document.body;
  if (!body) return;
  if (mode === "dark") body.classList.add("dark-mode");
  else if (mode === "light") body.classList.remove("dark-mode");
  else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? body.classList.add("dark-mode") : body.classList.remove("dark-mode");
  }
}

function initThemeControls() {
  const select = document.getElementById("themeToggle");
  if (!select) return;
  const saved = localStorage.getItem("theme") || "system";
  select.value = saved;
  applyTheme(saved);
  select.addEventListener("change", e => {
    const val = e.target.value;
    localStorage.setItem("theme", val);
    applyTheme(val);
  });
}

function initMobileThemeControls() {
  const select = document.getElementById("mobileThemeToggle");
  if (!select) return;
  const saved = localStorage.getItem("theme") || "system";
  select.value = saved;
  applyTheme(saved);
  select.addEventListener("change", (e) => {
    const val = e.target.value;
    localStorage.setItem("theme", val);
    applyTheme(val);
    const desktopSelect = document.getElementById("themeToggle");
    if (desktopSelect) desktopSelect.value = val;
  });
}

// --- Mobile sidebar ---
function toggleSidebar(open = null) {
  const sidebar = document.getElementById("mobileSidebar");
  if (!sidebar) return;
  const isOpen = !sidebar.classList.contains("-translate-x-full");
  if (open === true || (!isOpen && open === null)) sidebar.classList.remove("-translate-x-full");
  else sidebar.classList.add("-translate-x-full");
}

// --- Firebase interactions (poll, survey, volunteers) ---
async function getIP() {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = await res.json();
  return data.ip;
}

async function submitPollVote(isYes) {
  try {
    const ip = await getIP();
    const ipKey = encodeURIComponent(ip.replace(/\./g, "_"));
    const ipRef = window.ref(db, "ipVotes/" + ipKey);

    const snapshot = await window.get(ipRef);
    if (snapshot.exists()) {
      alert("This network/IP has already voted!");
      return;
    }

    // ✅ Save IP vote to prevent duplicates
    await window.set(ipRef, {
      vote: isYes ? "yes" : "no",
      ts: window.serverTimestamp(),
    });

    // ✅ Also push a poll vote entry so counters work
    const pollRef = window.ref(db, "pollVotes");
    await window.push(pollRef, {
      vote: isYes ? "yes" : "no",
      ts: window.serverTimestamp(),
    });

    alert("✅ Thanks — your vote was recorded!");
  } catch (e) {
    console.error("Error submitting vote:", e);
    alert("Failed to submit vote. Try again.");
  }
}



function startRealtimePoll() {
  const votesRef = window.ref(db, "pollVotes");
  window.onValue(votesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const votes = Object.values(data);
    let yes = 0, no = 0;
    votes.forEach(v => {
      if (v.vote === "yes") yes++;
      else if (v.vote === "no") no++;
    });
    document.getElementById("pollYesCount").textContent = yes;
    document.getElementById("pollNoCount").textContent = no;
  });
}

async function submitSurvey(formData) {
  try {
    const refPath = window.ref(db, "surveyResponses");
    await window.push(refPath, {
      ...formData,
      ts: window.serverTimestamp()
    });
    document.getElementById("surveyMessage").classList.remove("hidden");
    setTimeout(()=> document.getElementById("surveyMessage").classList.add("hidden"), 3000);
  } catch (e) {
    console.error("Error submitting survey:", e);
    alert("Failed to submit survey. Try again.");
  }
}

function startSurveyCount() {
  const refPath = window.ref(db, "surveyResponses");
  window.onValue(refPath, (snapshot) => {
    const data = snapshot.val() || {};
    const count = Object.keys(data).length;
    document.getElementById("surveyCount").textContent = count || 0;
  });
}

async function submitVolunteer(name, contact) {
  try {
    const refPath = window.ref(db, "volunteers");
    await window.push(refPath, {
      name: name || "",
      contact: contact || "",
      ts: window.serverTimestamp()
    });
    const msg = document.getElementById("volMessage");
    msg.classList.remove("hidden");
    setTimeout(()=> msg.classList.add("hidden"), 4000);
  } catch (e) {
    console.error("Error signing up volunteer:", e);
    alert("Failed to sign up. Try again.");
  }
}

// --- On load ---
document.addEventListener("DOMContentLoaded", () => {
  initThemeControls();
  initMobileThemeControls();
  showSection("home");

  // Start realtime listeners
  startRealtimePoll();
  startSurveyCount();

  // Poll form handled inline by buttons

  // Survey submit handler
  const surveyForm = document.getElementById("surveyForm");
  surveyForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q1 = document.getElementById("q1").value;
    const q2 = document.getElementById("q2").value;
    const q3 = document.getElementById("q3").value.trim();
    const q4 = document.getElementById("q4").value.trim();
    if (!q1 || !q2) return alert("Please answer the required questions.");
    submitSurvey({ q1, q2, q3, q4 });
    e.target.reset();
  });

  // Volunteer form handler
  const volForm = document.getElementById("volunteerForm");
  volForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("volName").value.trim();
    const contact = document.getElementById("volContact").value.trim();
    if (!name || !contact) return alert("Please provide your name and contact.");
    submitVolunteer(name, contact);
    e.target.reset();
  });

  // Sidebar toggle
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const closeBtn = document.getElementById("closeSidebar");
  mobileBtn?.addEventListener("click", () => toggleSidebar(true));
  closeBtn?.addEventListener("click", () => toggleSidebar(false));
});
