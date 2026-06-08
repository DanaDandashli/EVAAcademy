"use strict";

function getCsrf() {
  return (
    document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
    document.cookie.match(/csrftoken=([^;]+)/)?.[1] ||
    ""
  );
}

/* ── Reveal on scroll ── */
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
);
revealEls.forEach((el) => revealObserver.observe(el));

function triggerVisible() {
  revealEls.forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight)
      el.classList.add("visible");
  });
}
window.addEventListener("load", triggerVisible);
setTimeout(triggerVisible, 100);

/* ── Animate bars helper ── */
function animateBarsIn(container) {
  container.querySelectorAll(".profile-xp-fill").forEach((el) => {
    const pct = el.dataset.pct || 0;
    el.style.width = "0%";
    setTimeout(() => {
      el.style.width = pct + "%";
    }, 300);
  });

  container.querySelectorAll(".quest-bar-fill[data-pct]").forEach((bar) => {
    const pct = bar.dataset.pct || 0;
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.width = pct + "%";
    }, 500);
  });

  container.querySelectorAll(".progress-bar-fg[data-pct]").forEach((bar) => {
    bar.style.transition = "none";
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.transition = "width 1.2s cubic-bezier(0.4,0,0.2,1)";
      bar.style.width = (bar.dataset.pct || 0) + "%";
    }, 200);
  });
}

/* ── Animated bars on load ── */
window.addEventListener("load", () => {
  animateBarsIn(document);

  const ring = document.getElementById("xpRingFill");
  if (ring) {
    const pct = parseFloat(ring.dataset.pct || 0) / 100;
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    setTimeout(() => {
      ring.style.strokeDashoffset = circumference * (1 - pct);
    }, 400);
  }
});

/* ── Advisor vars ── */
let advEditor = null;
let evaGreeted = false;

/* ── EVA Auto Greeting ── */
async function sendAutoGreeting() {
  const evaTyping = document.getElementById("evaTyping");
  const chatMessages = document.getElementById("advChatMessages");
  if (!evaTyping || !chatMessages) return;

  evaTyping.style.display = "flex";

  try {
    const response = await fetch("/advisor/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify({
        message: "Assign me a targeted practice challenge based on my weak areas. Follow the teaching philosophy strictly — describe WHAT to achieve without mentioning syntax, or expected output.",
        code: "",
        lesson: "General Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
        is_greeting: true,
      }),
    });

    const data = await response.json();
    evaTyping.style.display = "none";
    appendEvaMsg(data.reply || "Hi! What would you like to practice today?");
  } catch (err) {
    evaTyping.style.display = "none";
  }
}

/* ── Panel switcher ── */
function switchPanel(panelId, btn) {
  document
    .querySelectorAll(".mid-panel")
    .forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById("panel-" + panelId);
  panel.classList.add("active");

  document
    .querySelectorAll(".sidebar-nav-item")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const grid = document.querySelector(".dash-grid");
  const rightCol = document.querySelector(".dash-col--right");

  if (panelId === "learning-path") {
    grid.classList.remove("hide-right");
    if (rightCol) rightCol.style.display = "";
  } else {
    grid.classList.add("hide-right");
    if (rightCol) rightCol.style.display = "none";
  }

  if (panelId === "progress") {
    setTimeout(() => animateBarsIn(panel), 300);
  } else {
    setTimeout(() => animateBarsIn(panel), 100);
  }

  if (panelId === "advisor") {
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
        const existingMessages = msgs
          ? msgs.querySelectorAll(".adv-msg.eva:not(.typing-indicator)").length
          : 0;
        if (existingMessages === 0) {
          sendAutoGreeting();
        }
      }
    }, 200);
  }
  
  if (panelId === "leaderboard-mid" && lbOffset === 0) {
    loadLeaderboard();
  }
}

/* ── Tab switcher (quests/badges) ── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      const tabsContainer = btn.closest(".dash-tabs");
      if (!tabsContainer) return;
      tabsContainer
        .querySelectorAll(".dash-tab")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");

      const panelMap = { quests2: "panelQuests2", badges2: "panelBadges2" };
      ["panelQuests2", "panelBadges2"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });
      const target = document.getElementById(panelMap[tab]);
      if (target) {
        target.classList.remove("hidden");
        setTimeout(() => animateBarsIn(target), 100);
      }
    });
  });

  const el = document.querySelector(".profile-avatar-initial");
  if (el) {
    const letter = el.textContent.trim().toUpperCase();
    const colors = [
      "#F44336",
      "#E91E63",
      "#9C27B0",
      "#673AB7",
      "#3F51B5",
      "#2196F3",
      "#009688",
      "#4CAF50",
      "#FF9800",
      "#FF5722",
      "#795548",
      "#607D8B",
      "#D81B60",
      "#00897B",
      "#1E88E5",
      "#8E24AA",
    ];
    el.style.backgroundColor = colors[letter.charCodeAt(0) % colors.length];
  }
});

/* ── Confetti ── */
const canvas = document.getElementById("confettiCanvas");
const ctx = canvas?.getContext("2d");
let confettiRAF = null;
const COLORS = [
  "#008080",
  "#00a0a0",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
];

function launchConfetti(count) {
  count = count || 120;
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height * 0.3,
    r: 5 + Math.random() * 6,
    d: 1.5 + Math.random() * 2.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tiltAngle: 0,
    tiltSpeed: 0.04 + Math.random() * 0.06,
    shape: Math.random() > 0.5 ? "rect" : "circle",
    opacity: 1,
  }));

  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach((p) => {
      if (p.y > canvas.height + 30 || p.opacity <= 0) return;
      alive = true;
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d;
      p.x += Math.sin(p.tiltAngle) * 1.5;
      if (frame > 120) p.opacity -= 0.012;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tiltAngle);
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    frame++;
    if (alive) confettiRAF = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

/* ── XP Toast ── */
const xpToast = document.getElementById("xpToast");
function showXPToast(msg) {
  msg = msg || "+50 XP earned!";
  if (!xpToast) return;
  xpToast.querySelector("span").textContent = msg;
  xpToast.classList.add("show");
  setTimeout(() => xpToast.classList.remove("show"), 2800);
}

/* ── Level-up modal ── */
const lvlupOverlay = document.getElementById("lvlupOverlay");
const lvlupClose = document.getElementById("lvlupClose");

function showLevelUp() {
  lvlupOverlay?.classList.add("show");
  launchConfetti(160);
}
lvlupClose?.addEventListener("click", () => {
  lvlupOverlay?.classList.remove("show");
  if (confettiRAF && ctx) {
    cancelAnimationFrame(confettiRAF);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

/* ── Toast system ── */
const toastContainer = document.getElementById("toastContainer");

function showToast(type, message) {
  if (!toastContainer) return;
  const icons = {
    success: "fa-check-circle",
    info: "fa-circle-info",
    error: "fa-exclamation-circle",
  };
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerHTML =
    '<i class="fas ' +
    (icons[type] || icons.info) +
    ' toast-icon"></i><span class="toast-msg">' +
    message +
    "</span>";
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 320);
  }, 3500);
  toast.addEventListener("click", () => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 320);
  });
}

/* ── Leaderboard clicks ── */
document.querySelectorAll(".lb-item").forEach((item) => {
  item.addEventListener("click", () => {
    const name =
      item.querySelector(".lb-name")?.textContent?.trim() || "Player";
    const xp = item.querySelector(".lb-xp")?.textContent?.trim() || "";
    showToast("info", name + " - " + xp);
  });
});

// ── Leaderboard ──
let lbOffset = 0;
let lbLoading = false;

function loadLeaderboard() {
  if (lbLoading) return;
  lbLoading = true;

  const btn = document.getElementById("lbLoadMoreBtn");
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin fa-xs"></i> Loading...';

  fetch(`/leaderboard/?offset=${lbOffset}`)
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById("lbFullRows");

      data.rows.forEach(row => {
        if (row.rank <= 3) return; // skip top 3, already in podium
        const li = document.createElement("li");
        li.className = "lb-item" + (row.is_you ? " lb-you" : "");
        li.innerHTML = `
          <span class="lb-rank-num ${row.is_you ? 'you-num' : ''}">${row.rank}</span>
          <div class="lb-avatar-initial">${row.username.slice(0,1).toUpperCase()}</div>
          <div class="lb-info">
            <span class="lb-name">${row.is_you ? 'YOU' : row.username}${row.is_you ? ' <i class="fas fa-star lb-you-star"></i>' : ''}</span>
            <span class="lb-xp">${row.xp} XP</span>
          </div>
          <span class="lb-level">Lv.${row.level}</span>`;
        container.appendChild(li);
      });

      lbOffset += data.rows.length;
      lbLoading = false;

      const wrap = document.getElementById("lbLoadMoreWrap");
      if (wrap) wrap.style.display = data.has_more ? "block" : "none";
      if (btn) btn.innerHTML = '<i class="fas fa-chevron-down fa-xs"></i> Load More';
    })
    .catch(() => { lbLoading = false; });
}

/* ── Badge clicks ── */
document.querySelectorAll(".badge-item.earned").forEach((item) => {
  item.addEventListener("click", () => {
    const name = item.querySelector("span")?.textContent || "Badge";
    showToast("success", '"' + name + '" badge earned!');
    launchConfetti(60);
  });
});

/* ── Advisor chat ── */
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
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

let currentEvaTask = "";

function appendEvaMsg(text) {
  if (!chatMessages || !evaTyping) return;
  evaTyping.style.display = "none";

  // Save as current task
  currentEvaTask = text;

  const div = document.createElement("div");
  div.className = "adv-msg eva";
  div.innerHTML =
    '<div class="adv-msg-avatar"><img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/></div><div class="adv-msg-bubble"><p>' +
    parseMarkdown(text) +
    "</p></div>";
  chatMessages.insertBefore(div, evaTyping);
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

async function sendMessage() {
  const text = chatInput?.value.trim();
  if (!text) return;
  appendUserMsg(text);
  chatInput.value = "";

  const code = advEditor ? advEditor.getValue() : "";
  const lesson =
    document.querySelector(".adv-task-title")?.textContent || "Python";

  if (evaTyping) {
    evaTyping.style.display = "flex";
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  try {
    const response = await fetch("/advisor/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify({
        message:
          'CURRENT TASK: "' +
          currentEvaTask.substring(0, 150) +
          '". Student says: ' +
          text,
        code: advEditor ? advEditor.getValue() : "",
        lesson: lesson,
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
        // history: evaConversationHistory.slice(-4), // reduce to last 4 messages only
      }),
    });

    const data = await response.json();
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg(data.reply || "I am thinking... try again!");
  } catch (err) {
    console.error("EVA fetch error:", err); 
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

/* ── Advisor run button ── */
const advRunBtn = document.getElementById("advRunBtn");
const advOutputBody = document.getElementById("advOutputBody");
const advOutputStatus = document.getElementById("advOutputStatus");

advRunBtn?.addEventListener("click", async () => {
  const code = advEditor ? advEditor.getValue() : "";
  if (!code.trim()) return;

  advRunBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
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
    inputfun: (prompt) => new Promise((resolve) => {
        const overlay  = document.getElementById("skInputOverlay");
        const promptEl = document.getElementById("skInputPromptText");
        const field    = document.getElementById("skInputField");
        const btn      = document.getElementById("skInputSubmit");
        promptEl.textContent  = prompt || "Enter input:";
        field.value           = "";
        overlay.style.display = "flex";
        field.focus();
        function submit() {
          overlay.style.display = "none";
          btn.removeEventListener("click", submit);
          field.removeEventListener("keydown", onEnter);
          resolve(field.value);
        }
        function onEnter(e) { if (e.key === "Enter") submit(); }
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

    // Send output to EVA
    const lastEvaMsg = chatMessages
      ? [
          ...chatMessages.querySelectorAll(
            ".adv-msg.eva:not(.typing-indicator)",
          ),
        ]
          .pop()
          ?.querySelector("p")?.textContent || ""
      : "";

    const summary = outputText
      ? 'CURRENT TASK: "' +
        currentEvaTask.substring(0, 150) +
        '". My code:\n' +
        code +
        "\nOutput: " +
        outputText +
        ". Check if I used the correct Python concept in my code. If yes give me a new challenge. If no, guide me without writing code."
      : 'CURRENT TASK: "' +
        currentEvaTask.substring(0, 150) +
        '". My code:\n' +
        code +
        "\nI ran my code but got no output. What went wrong?";

    if (evaTyping) evaTyping.style.display = "flex";
    const evaResponse = await fetch("/advisor/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify({
        message: summary,
        code: code,
        lesson:
          document.querySelector(".adv-task-title")?.textContent || "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
      }),
    });

    const evaData = await evaResponse.json();
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg(evaData.reply || "Great job running your code!");
  } catch (err) {
    let errorMsg = "";
    if (err.toString().includes("printf")) {
      errorMsg = "NameError: printf is not defined. Did you mean print()?";
    } else {
      errorMsg = err
        .toString()
        .replace("RangeError: ", "")
        .replace("undefined", "Error in your code");
    }

    const errEl = document.createElement("div");
    errEl.className = "adv-out-line err";
    errEl.textContent = err.toString();
    console.log(err);
    advOutputBody.appendChild(errEl);

    if (advOutputStatus) {
      advOutputStatus.textContent = "error";
      advOutputStatus.className = "adv-output-status error";
    }

    // Tell EVA about the error
    if (evaTyping) evaTyping.style.display = "flex";
    const evaResponse = await fetch("/advisor/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify({
        message: "I got this error: " + err.toString(),
        code: code,
        lesson:
          document.querySelector(".adv-task-title")?.textContent || "Python",
        eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
      }),
    });

    const evaData = await evaResponse.json();
    if (evaTyping) evaTyping.style.display = "none";
    appendEvaMsg(evaData.reply || "Looks like there is an error. Let me help!");
  }

  advRunBtn.innerHTML = '<i class="fas fa-play"></i> Run';
});

/* ── Achievement detail panel ── */
function showAchievement(title, desc, icon, color, earned) {
  const panel = document.getElementById("achievementDetail");
  const titleEl = document.querySelector(".achievements-title");
  const iconWrap = document.getElementById("achDetailIcon");
  const iconEl = document.getElementById("achDetailIconI");

  document.getElementById("achDetailTitle").textContent = title;
  document.getElementById("achDetailDesc").textContent = desc;

  iconEl.className = icon;
  iconEl.style.color = earned ? color : "#9ca3af";
  iconWrap.style.background = earned ? color + "22" : "#f3f4f6";

  const badge = document.getElementById("achDetailBadge");
  badge.textContent = earned ? "Earned" : "Locked";
  badge.className =
    "achievement-detail-badge " + (earned ? "earned" : "locked");

  titleEl.parentNode.insertBefore(panel, titleEl);
  panel.style.display = "flex";
  panel.style.animation = "none";
  panel.offsetHeight;
  panel.style.animation = "";
}
