"use strict";

// ── Navigation ──
let currentPanel = "home";
let chartsInit = false;

function navigateTo(panel, navEl) {
  if (panel === currentPanel) {
    closeSidebar();
    return;
  }

  const old = document.getElementById("panel-" + currentPanel);
  if (old) {
    old.style.animation = "panelOut 0.3s cubic-bezier(0.4,0,0.2,1) both";
    setTimeout(() => {
      old.classList.remove("active");
      old.style.animation = "";
    }, 280);
  }

  setTimeout(() => {
    currentPanel = panel;
    const next = document.getElementById("panel-" + panel);
    if (next) next.classList.add("active");

    document
      .querySelectorAll(".nav-item")
      .forEach((i) => i.classList.remove("active"));
    if (navEl) navEl.classList.add("active");

    if (panel === "home") {
      animateSkillBars(".skill-fill", "data-w");
      animateLpProgress();
      if (!chartsInit) {
        initCharts();
        chartsInit = true;
      }
    }
    if (panel === "learning-path") {
      animateLpProgress();
    }
    if (panel === "progress") {
      setTimeout(() => animateSkillBars(".prog-skill-fill", "data-pw"), 200);
      initProgressChart();
    }
    if (panel === "leaderboard" && lbOffset === 0) {
      loadLeaderboard();
    }
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 150);
}

// ── Sidebar ──
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("show");
}

// ── Skill bars animation ──
function animateSkillBars(selector, attr) {
  document.querySelectorAll(selector).forEach((bar) => {
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.width = (bar.getAttribute(attr) || 0) + "%";
    }, 100);
  });
}

// ── XP bar in sidebar ──
function animateXpBar() {
  const bar = document.getElementById("profileXpBar");
  if (!bar) return;
  const pct = bar.dataset.pct || 0;
  bar.style.width = "0%";
  setTimeout(() => {
    bar.style.width = pct + "%";
  }, 400);
}

// ── LP progress bar ──
function animateLpProgress() {
  const el = document.getElementById("lpFill");
  if (!el) return;
  const target = el.style.width;
  el.style.width = "0%";
  setTimeout(() => {
    el.style.width = target;
  }, 200);
}


// ── Charts ──
function initCharts() {
  // XP Progress chart
  const xCtx = document.getElementById("xpChart");
  if (xCtx) {
    const g = xCtx.getContext("2d").createLinearGradient(0, 0, 0, 155);
    g.addColorStop(0, "rgba(108,99,255,0.38)");
    g.addColorStop(1, "rgba(108,99,255,0)");

    // Build XP data from completed nodes
    const xpByNode = {
      introduction: CHART_DATA?.introCount * 10 || 0,
      application: CHART_DATA?.appCount * 30 || 0,
      competition: CHART_DATA?.compCount * 50 || 0,
      test: CHART_DATA?.testCount * 100 || 0,
    };
    const labels = ["Introduction", "Application", "Competition", "Test"];
    const data = [
      xpByNode.introduction,
      xpByNode.application,
      xpByNode.competition,
      xpByNode.test,
    ];

    new Chart(xCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "XP Earned",
            data,
            backgroundColor: [
              "rgba(108,99,255,0.7)",
              "rgba(0,212,255,0.7)",
              "rgba(255,107,157,0.7)",
              "rgba(6,214,160,0.7)",
            ],
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(10,10,26,0.95)",
            borderColor: "rgba(108,99,255,0.4)",
            borderWidth: 1,
            titleColor: "#e8e8ff",
            bodyColor: "#8888bb",
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { color: "#8888bb", font: { size: 11 } },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { color: "#8888bb", font: { size: 11 } },
            min: 0,
          },
        },
        animation: { duration: 1200, easing: "easeOutQuart" },
      },
    });
  }

  // Node Completion radar
  const rCtx = document.getElementById("radarChart");
  if (rCtx) {
    const total = CHART_DATA?.totalSections || 1;
    new Chart(rCtx, {
      type: "radar",
      data: {
        labels: [
          "Introduction",
          "Application",
          "Competition",
          "Test",
          "Overall",
        ],
        datasets: [
          {
            label: "Completion %",
            data: [
              CHART_DATA?.introCount
                ? Math.round((CHART_DATA.introCount / (total / 4)) * 100)
                : 0,
              CHART_DATA?.appCount
                ? Math.round((CHART_DATA.appCount / (total / 4)) * 100)
                : 0,
              CHART_DATA?.compCount
                ? Math.round((CHART_DATA.compCount / (total / 4)) * 100)
                : 0,
              CHART_DATA?.testCount
                ? Math.round((CHART_DATA.testCount / (total / 4)) * 100)
                : 0,
              CHART_DATA?.overallPct || 0,
            ],
            borderColor: "#6c63ff",
            borderWidth: 2,
            backgroundColor: "rgba(108,99,255,0.18)",
            pointBackgroundColor: "#6c63ff",
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            grid: { color: "rgba(255,255,255,0.07)" },
            angleLines: { color: "rgba(255,255,255,0.07)" },
            pointLabels: { color: "#8888bb", font: { size: 11 } },
            ticks: { display: false, stepSize: 25 },
            min: 0,
            max: 100,
          },
        },
        animation: { duration: 1400, easing: "easeOutQuart" },
      },
    });
  }
}

let progressChartInst = null;
function initProgressChart() {
  const el = document.getElementById("progressChart");
  if (!el || progressChartInst) return;
  const g = el.getContext("2d").createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0, "rgba(0,212,255,0.35)");
  g.addColorStop(1, "rgba(0,212,255,0)");

  const completedLessons = CHART_DATA?.completedLessons || [];
  const labels = [
    "Start",
    ...completedLessons.slice(0, 3).map((l, i) => `Lesson ${i + 1}`),
    "Now",
  ].slice(0, 5);
  const xp = CHART_DATA?.xpCur || 0;
  const dataPoints = labels.map((_, i) => {
    if (i === 0) return 0;
    if (i === labels.length - 1) return xp;
    const fractions = [0.15, 0.4, 0.75];
    return Math.round(xp * (fractions[i - 1] || 0.5));
  });

  progressChartInst = new Chart(el, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "XP",
          data: dataPoints,
          borderColor: "#00d4ff",
          borderWidth: 2.5,
          backgroundColor: g,
          pointBackgroundColor: "#00d4ff",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(10,10,26,0.95)",
          borderColor: "rgba(0,212,255,0.4)",
          borderWidth: 1,
          titleColor: "#e8e8ff",
          bodyColor: "#8888bb",
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#8888bb", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#8888bb", font: { size: 11 } },
        },
      },
      animation: { duration: 1200, easing: "easeOutQuart" },
    },
  });
}

// ── EVA Advisor ──
async function sendEvaMsg() {
  const input = document.getElementById("evaInput");
  const msgs = document.getElementById("evaMessages");
  if (!input || !msgs || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = "";

  // User message
  const userDiv = document.createElement("div");
  userDiv.className = "msg user";
  userDiv.innerHTML = `<div class="msg-bubble">${text}</div><div class="msg-time">Just now</div>`;
  msgs.appendChild(userDiv);
  msgs.scrollTop = msgs.scrollHeight;

  // Typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.innerHTML = `<div class="msg-bubble" style="color:var(--text-muted);font-style:italic"><i class="fa-solid fa-ellipsis fa-beat"></i> EVA is thinking...</div>`;
  msgs.appendChild(typingDiv);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const response = await fetch("/advisor/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        message: text,
        code: "",
        lesson: "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
        is_greeting: false,
      }),
    });
    const data = await response.json();
    typingDiv.innerHTML = `<div class="msg-bubble"><i class="fa-solid fa-robot fa-xs" style="color:var(--accent2);margin-right:5px"></i>${data.reply || "Let me think about that!"}</div><div class="msg-time">Just now</div>`;
  } catch (err) {
    typingDiv.innerHTML = `<div class="msg-bubble">I am having trouble connecting. Try again!</div>`;
  }
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendAutoGreeting() {
  const msgs = document.getElementById("evaMessages");
  if (!msgs) return;

  // Only greet if no messages yet
  if (msgs.querySelectorAll(".msg").length > 0) return;

  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.innerHTML = `<div class="msg-bubble" style="color:var(--text-muted);font-style:italic"><i class="fa-solid fa-ellipsis fa-beat"></i> EVA is thinking...</div>`;
  msgs.appendChild(typingDiv);

  try {
    const response = await fetch("/advisor/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        message:
          "Assign me a targeted practice challenge based on my weak areas. Follow the teaching philosophy strictly — describe WHAT to achieve without mentioning syntax or expected output.",
        code: "",
        lesson: "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
        is_greeting: true,
      }),
    });
    const data = await response.json();
    typingDiv.innerHTML = `<div class="msg-bubble"><i class="fa-solid fa-robot fa-xs" style="color:var(--accent2);margin-right:5px"></i>${data.reply || "Hi! Ready to practice?"}</div><div class="msg-time">Just now</div>`;
  } catch (err) {
    typingDiv.remove();
  }
  msgs.scrollTop = msgs.scrollHeight;
}

function sendSuggestion(el) {
  const input = document.getElementById("evaInput");
  if (input) {
    input.value = el.textContent.trim();
    sendEvaMsg();
  }
}

// ── EVA clear button ──
document.getElementById("evaClearBtn")?.addEventListener("click", () => {
  const msgs = document.getElementById("evaMessages");
  if (msgs) msgs.innerHTML = "";
  sendAutoGreeting();
});

// ── Leaderboard ──
let lbOffset = 0;
let lbLoading = false;

function loadLeaderboard() {
  if (lbLoading) return;
  lbLoading = true;

  const btn = document.getElementById("lbLoadMoreBtn");
  if (btn)
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin fa-xs"></i> Loading...';

  fetch(`/leaderboard/?offset=${lbOffset}`)
    .then((r) => r.json())
    .then((data) => {
      const container = document.getElementById("lbFullRows");
      const template = document.getElementById("lbRowTemplate");

      data.rows.forEach((row) => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector(".lb-full-row");

        if (row.is_you) item.classList.add("you-row");

        // Rank
        const rankEl = clone.querySelector(".lb-rank");
        if (row.rank <= 3) {
          const colors = { 1: "#ffd166", 2: "#c0c0c0", 3: "#cd7f32" };
          rankEl.style.color = colors[row.rank];
          rankEl.innerHTML = '<i class="fa-solid fa-medal"></i>';
        } else {
          rankEl.textContent = row.rank;
        }

        // Avatar & name
        clone.querySelector(".lb-avatar").textContent = row.username
          .slice(0, 2)
          .toUpperCase();
        clone.querySelector(".lb-name").textContent = row.username;
        clone.querySelector(".lb-level").textContent = "Lv." + row.level;

        // YOU badge
        if (row.is_you) {
          const badge = document.createElement("span");
          badge.style.cssText =
            "font-size:0.58rem;background:rgba(108,99,255,0.2);color:var(--accent);padding:1px 5px;border-radius:4px;margin-left:5px";
          badge.textContent = "YOU";
          clone.querySelector(".lb-name").appendChild(badge);
        }

        // Level & XP columns
        clone.querySelector(".lb-col-level").textContent = row.level;
        clone.querySelector(".lb-col-xp").textContent = row.xp;

        container.appendChild(clone);
      });

      lbOffset += data.rows.length;
      lbLoading = false;

      const wrap = document.getElementById("lbLoadMoreWrap");
      if (wrap) wrap.style.display = data.has_more ? "block" : "none";
      if (btn)
        btn.innerHTML =
          '<i class="fa-solid fa-chevron-down fa-xs"></i> Load More';
    })
    .catch(() => {
      lbLoading = false;
    });
}

// ── Init ──
window.addEventListener("DOMContentLoaded", () => {
  animateXpBar();
  animateLpProgress();
  setTimeout(() => animateSkillBars(".skill-fill", "data-w"), 500);
  setTimeout(() => {
    initCharts();
    chartsInit = true;
  }, 300);

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.getAttribute("onclick")?.includes("eva")) {
        setTimeout(sendAutoGreeting, 300);
      }
    });
  });
});
