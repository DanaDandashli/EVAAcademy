"use strict";

// Prevent browser from scrolling to top on refresh
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// ── Navigation ──
let currentPanel = "home";
let chartsInit = false;

// ── Advisor vars ──
let advEditor = null;
let evaGreeted = false;

function savePanel(panel) {
  try {
    localStorage.setItem("eva_panel_" + CURRENT_USER, panel);
  } catch (e) {}
}
function getSavedPanel() {
  try {
    return localStorage.getItem("eva_panel_" + CURRENT_USER);
  } catch (e) {
    return null;
  }
}
function clearPanel() {
  try {
    localStorage.removeItem("eva_panel_" + CURRENT_USER);
  } catch (e) {}
}

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
    savePanel(panel);
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
    }
    if (panel === "eva") {
      setTimeout(() => {
        if (!advEditor) {
          const advTextarea = document.getElementById("advCodeEditor");
          if (advTextarea && typeof CodeMirror !== "undefined") {
            advEditor = CodeMirror.fromTextArea(advTextarea, {
              mode: "python",
              theme: "dracula",
              lineNumbers: true,
              indentUnit: 4,
              tabSize: 4,
              indentWithTabs: false,
              lineWrapping: true,
            });
          }
        }
        if (advEditor) advEditor.refresh();
        if (!evaGreeted) {
          evaGreeted = true;
          const msgs = document.getElementById("advChatMessages");
          const existing = msgs
            ? msgs.querySelectorAll(".adv-msg.eva:not(.typing-indicator)")
                .length
            : 0;
          if (existing === 0) sendAutoGreeting();
        }
      }, 200);
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

// ── EVA Advisor ──
const chatMessages = document.getElementById("advChatMessages");
const chatInput = document.getElementById("advChatInput");
const chatSend = document.getElementById("advChatSend");
const evaTyping = document.getElementById("evaTyping");

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function appendUserMsg(text) {
  if (!chatMessages) return;
  const div = document.createElement("div");
  div.className = "adv-msg user";
  div.innerHTML =
    '<div class="adv-msg-bubble user-bubble"><p>' +
    escHtml(text) +
    '</p></div><span class="adv-msg-meta">Me</span>';
  chatMessages.insertBefore(div, evaTyping);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function parseMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.replace(/```(?:python)?\n?/, "").replace(/```$/, "");
      return (
        '<pre style="background:rgba(0,0,0,0.3);border-radius:8px;padding:10px;font-family:monospace;font-size:0.8rem;white-space:pre-wrap;margin:6px 0;">' +
        escHtml(code) +
        "</pre>"
      );
    })
    .replace(
      /`([^`]+)`/g,
      '<code style="background:rgba(108,99,255,0.15);color:var(--accent);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.82rem;">$1</code>',
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

let currentEvaTask = "";

function appendEvaMsg(text) {
  if (!chatMessages || !evaTyping) return;
  evaTyping.style.display = "none";
  currentEvaTask = text;
  const div = document.createElement("div");
  div.className = "adv-msg eva";
  div.innerHTML =
    '<div class="adv-eva-avatar"><img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/></div>' +
    '<div class="adv-msg-bubble"><p>' +
    parseMarkdown(text) +
    "</p></div>";
  chatMessages.insertBefore(div, evaTyping);
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

async function sendAutoGreeting() {
  const typing = document.getElementById("evaTyping");
  const msgs = document.getElementById("advChatMessages");
  if (!typing || !msgs) return;
  typing.style.display = "flex";
  try {
    const res = await fetch("/advisor/chat/", {
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
    const data = await res.json();
    typing.style.display = "none";
    appendEvaMsg(data.reply || "Hi! What would you like to practice today?");
  } catch {
    typing.style.display = "none";
  }
}

async function sendMessage() {
  const text = chatInput?.value.trim();
  if (!text) return;
  appendUserMsg(text);
  chatInput.value = "";
  if (evaTyping) {
    evaTyping.style.display = "flex";
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  try {
    const res = await fetch("/advisor/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        message:
          'CURRENT TASK: "' +
          currentEvaTask.substring(0, 150) +
          '". Student says: ' +
          text,
        code: advEditor ? advEditor.getValue() : "",
        lesson:
          document.querySelector(".adv-task-title")?.textContent || "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
      }),
    });
    const data = await res.json();
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg(data.reply || "I am thinking... try again!");
  } catch {
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg("I am having trouble connecting. Try again in a moment!");
  }
}

chatSend?.addEventListener("click", sendMessage);
chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

document.querySelectorAll(".adv-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (chatInput) {
      chatInput.value = chip.dataset.msg;
      sendMessage();
    }
  });
});

// ── EVA clear button ──
document.getElementById("evaClearBtn")?.addEventListener("click", () => {
  const msgs = document.getElementById("advChatMessages");
  if (msgs) {
    msgs
      .querySelectorAll(".adv-msg:not(.typing-indicator)")
      .forEach((el) => el.remove());
  }
  evaGreeted = false;
  sendAutoGreeting();
  evaGreeted = true;
});

// ── Advisor run button ──
const advRunBtn = document.getElementById("advRunBtn");
const advOutputBody = document.getElementById("advOutputBody");
const advOutputStatus = document.getElementById("advOutputStatus");

advRunBtn?.addEventListener("click", async () => {
  const code = advEditor ? advEditor.getValue() : "";
  if (!code.trim()) return;

  advRunBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
  advOutputBody.innerHTML = "";

  const cmdEl = document.createElement("div");
  cmdEl.className = "adv-out-line cmd";
  cmdEl.textContent = "$ python main.py";
  advOutputBody.appendChild(cmdEl);

  let outputText = "";

  Sk.configure({
    output: (text) => {
      outputText += text;
      const el = document.createElement("div");
      el.className = "adv-out-line cmd";
      el.textContent = text;
      advOutputBody.appendChild(el);
      advOutputBody.scrollTop = advOutputBody.scrollHeight;
    },
    read: (x) => {
      if (Sk.builtinFiles?.["files"][x] === undefined)
        throw "File not found: " + x;
      return Sk.builtinFiles["files"][x];
    },
    inputfun: (prompt) =>
      new Promise((resolve) => {
        const overlay = document.getElementById("skInputOverlay");
        const promptEl = document.getElementById("skInputPromptText");
        const field = document.getElementById("skInputField");
        const btn = document.getElementById("skInputSubmit");
        promptEl.textContent = prompt || "Enter input:";
        field.value = "";
        overlay.style.display = "flex";
        field.focus();
        function submit() {
          overlay.style.display = "none";
          btn.removeEventListener("click", submit);
          field.removeEventListener("keydown", onEnter);
          resolve(field.value);
        }
        function onEnter(e) {
          if (e.key === "Enter") submit();
        }
        btn.addEventListener("click", submit);
        field.addEventListener("keydown", onEnter);
      }),
    inputfunTakesPrompt: true,
  });

  try {
    await Sk.misceval.asyncToPromise(() =>
      Sk.importMainWithBody("<stdin>", false, code, true),
    );

    if (advOutputStatus) {
      advOutputStatus.textContent = "done";
      advOutputStatus.className = "adv-output-status success";
    }

    const summary = outputText
      ? 'CURRENT TASK: "' +
        currentEvaTask.substring(0, 150) +
        '". My code:\n' +
        code +
        "\nOutput: " +
        outputText +
        ". Check if I used the correct Python concept. If yes give me a new challenge. If no, guide me without writing code."
      : 'CURRENT TASK: "' +
        currentEvaTask.substring(0, 150) +
        '". My code:\n' +
        code +
        "\nI ran my code but got no output. What went wrong?";

    if (evaTyping) evaTyping.style.display = "flex";
    const evaRes = await fetch("/advisor/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        message: summary,
        code: code,
        lesson:
          document.querySelector(".adv-task-title")?.textContent || "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
      }),
    });
    const evaData = await evaRes.json();
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg(evaData.reply || "Great job running your code!");
  } catch (err) {
    const errEl = document.createElement("div");
    errEl.className = "adv-out-line err";
    errEl.textContent = err.toString();
    advOutputBody.appendChild(errEl);

    if (advOutputStatus) {
      advOutputStatus.textContent = "error";
      advOutputStatus.className = "adv-output-status error";
    }

    if (evaTyping) evaTyping.style.display = "flex";
    const evaRes = await fetch("/advisor/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        message: "I got this error: " + err.toString(),
        code: code,
        lesson:
          document.querySelector(".adv-task-title")?.textContent || "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
      }),
    });
    const evaData = await evaRes.json();
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg(evaData.reply || "Looks like there is an error. Let me help!");
  }

  advRunBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
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
        const initials = row.first_name
          ? (
              row.first_name[0] + (row.last_name ? row.last_name[0] : "")
            ).toUpperCase()
          : row.username.slice(0, 2).toUpperCase();

        const displayName = row.first_name
          ? `${row.first_name} ${row.last_name}`.trim()
          : row.username;

        clone.querySelector(".lb-avatar").textContent = initials;
        clone.querySelector(".lb-name").textContent = displayName;
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

  // ── Restore last visited panel instantly (no flash) ──
  const savedPanel = getSavedPanel();
  if (savedPanel && document.getElementById("panel-" + savedPanel) && savedPanel !== "home") {
    const homePanel = document.getElementById("panel-home");
    const savedPanelEl = document.getElementById("panel-" + savedPanel);
    if (homePanel) homePanel.classList.remove("active");
    if (savedPanelEl) savedPanelEl.classList.add("active");
    currentPanel = savedPanel;
    const savedNavEl = document.querySelector(
      `.nav-item[onclick*="'${savedPanel}'"]`,
    );
    document
      .querySelectorAll(".nav-item")
      .forEach((i) => i.classList.remove("active"));
    if (savedNavEl) savedNavEl.classList.add("active");
    // Trigger panel-specific inits
    if (savedPanel === "progress")
      setTimeout(() => animateSkillBars(".prog-skill-fill", "data-pw"), 200);
    if (savedPanel === "eva")
      setTimeout(() => {
        if (!advEditor) {
          const advTextarea = document.getElementById("advCodeEditor");
          if (advTextarea && typeof CodeMirror !== "undefined") {
            advEditor = CodeMirror.fromTextArea(advTextarea, {
              mode: "python",
              theme: "dracula",
              lineNumbers: true,
              indentUnit: 4,
              tabSize: 4,
              indentWithTabs: false,
              lineWrapping: true,
            });
          }
        }
        if (advEditor) advEditor.refresh();
        if (!evaGreeted) {
          evaGreeted = true;
          sendAutoGreeting();
        }
      }, 200);
    if (savedPanel === "leaderboard" && lbOffset === 0) loadLeaderboard();
  } else if (savedPanel) {
    clearPanel();
  }

  // ── Progress panel tab switcher (Progress / Badges) ──
  document.querySelectorAll("[data-progress-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.progressTab;

      // Update active tab button
      btn
        .closest(".dash-tabs")
        .querySelectorAll(".dash-tab")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");

      // Show/hide panels
      document.getElementById("panelProgressTab").style.display =
        tab === "progress" ? "" : "none";
      document.getElementById("panelBadgesTab").style.display =
        tab === "badges" ? "" : "none";

      // Animate skill bars when switching to progress tab
      if (tab === "progress") {
        setTimeout(() => animateSkillBars(".prog-skill-fill", "data-pw"), 100);
      }
    });
  });
});
