"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── Phases ──
  const phases = {
    matchmaking: document.getElementById("phaseMatchmaking"),
    countdown: document.getElementById("phaseCountdown"),
    battle: document.getElementById("phaseBattle"),
    result: document.getElementById("phaseResult"),
  };

  function showPhase(name) {
    Object.values(phases).forEach((p) => p.classList.add("hidden"));
    phases[name].classList.remove("hidden");
  }

  // ── Fake opponent data ──
  const opponents = [
    { name: "PyMaster99", level: 1 },
    { name: "CodeWizard", level: 1 },
    { name: "LoopLegend", level: 1 },
    { name: "ByteNinja", level: 1 },
  ];
  const opp = opponents[Math.floor(Math.random() * opponents.length)];

  document.getElementById("oppName").textContent = opp.name;
  document.getElementById("oppMeta").textContent = `Lv.${opp.level}`;
  document.getElementById("oppNameBattle").textContent = opp.name;
  document.getElementById("oppMetaBattle").textContent = `Lv.${opp.level}`;

  // ── Commentary helper ──
  function addCommentary(text, isSystem = false) {
    const list = document.getElementById("competeCommentary");
    const li = document.createElement("li");
    li.className = "commentary-item" + (isSystem ? " system" : "") + " new";
    li.innerHTML = isSystem
      ? `<div class="commentary-sys-icon"><i class="fas fa-circle-info"></i></div><p>${text}</p>`
      : `<div class="commentary-sys-icon" style="background:rgba(124,58,237,0.1)"><i class="fas fa-eye" style="color:var(--purple)"></i></div><p>${text}</p>`;
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
  }

  // ── Quick chat ──
  document.querySelectorAll(".compete-emoji-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msg = btn.dataset.chat;
      const log = document.getElementById("competeChatLog");
      const div = document.createElement("div");
      div.className = "compete-chat-msg you-msg new";
      div.innerHTML = `<span><strong>You:</strong> ${msg}</span>`;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;

      setTimeout(
        () => {
          const replies = ["😄", "lol!", "gg!", "good luck!", "🔥"];
          const reply = replies[Math.floor(Math.random() * replies.length)];
          const rdiv = document.createElement("div");
          rdiv.className = "compete-chat-msg opp-msg new";
          rdiv.innerHTML = `<span><strong>${opp.name}:</strong> ${reply}</span>`;
          log.appendChild(rdiv);
          log.scrollTop = log.scrollHeight;
        },
        800 + Math.random() * 1000,
      );
    });
  });

  // ── Start battle ──
  document.getElementById("competeStartBtn").addEventListener("click", () => {
    showPhase("countdown");
    addCommentary(`${opp.name} has joined the battle!`, true);

    let count = 3;
    const ring = document.getElementById("countdownRingFill");
    const num = document.getElementById("countdownNum");
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = 0;

    const timer = setInterval(() => {
      count--;
      num.textContent = count || "GO!";
      ring.style.strokeDashoffset = circumference * ((3 - count) / 3);

      if (count <= 0) {
        clearInterval(timer);
        setTimeout(() => {
          showPhase("battle");
          addCommentary("Battle started! Both coders are typing...", true);
          startBattleTimer();
          simulateOpponent();
        }, 600);
      }
    }, 1000);
  });

  // ── Battle timer ──
  let battleInterval = null;
  let totalSeconds = 300; // 5 minutes
  let userTests = 0;
  let oppFinished = false;

  function startBattleTimer() {
    const fill = document.getElementById("battleTimerFill");
    const val = document.getElementById("battleTimerVal");

    battleInterval = setInterval(() => {
      totalSeconds--;
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      val.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      fill.style.width = (totalSeconds / 300) * 100 + "%";

      if (totalSeconds / 300 < 0.3) {
        fill.style.background = "linear-gradient(90deg,#ef4444,#f97316)";
      }

      if (totalSeconds <= 0) {
        clearInterval(battleInterval);
        // Time's up — whoever has more tests wins
        const oppTestsVal = parseInt(
          document.getElementById("oppTestsVal").textContent.split("/")[0],
        );
        if (userTests >= oppTestsVal) {
          endBattle(true, "timeout");
        } else {
          endBattle(false, "timeout");
        }
      }
    }, 1000);
  }

  // ── Simulate opponent ──
  function simulateOpponent() {
    const oppFill = document.getElementById("oppTestsFill");
    const oppVal = document.getElementById("oppTestsVal");
    const oppCode = document.getElementById("oppCodeView");

    const codeLines = [
      "# Solving the challenge...",
      'name = "Opponent"',
      "age  = 14",
      'print("Hello, " + name)',
      "score = age * 10",
      'print("Score:", score)',
    ];

    let lineIdx = 0;
    let oppTests = 0;

    // Opponent finishes between 90 and 150 seconds
    const oppFinishTime = (90 + Math.random() * 60) * 1000;
    const intervalTime = oppFinishTime / codeLines.length;

    const typeInterval = setInterval(() => {
      if (lineIdx < codeLines.length) {
        oppCode.innerHTML += `<div style="font-family:monospace;font-size:0.82rem;color:#e2e8f0;line-height:1.7">${codeLines[lineIdx]}</div>`;
        lineIdx++;
        oppTests = Math.min(5, Math.floor((lineIdx / codeLines.length) * 5));
        oppFill.style.width = (oppTests / 5) * 100 + "%";
        oppVal.textContent = `${oppTests}/5`;
        if (lineIdx < codeLines.length) {
          addCommentary(`${opp.name} is making progress...`);
        }
      }
    }, intervalTime);

    // Opponent finishes
    setTimeout(() => {
      clearInterval(typeInterval);
      oppFinished = true;
      oppFill.style.width = "100%";
      oppVal.textContent = "5/5";

      const statusEl = document.getElementById("oppStatusCoding");
      if (statusEl) {
        statusEl.className = "compete-status-pill done";
        statusEl.innerHTML = '<i class="fas fa-check"></i> Done!';
      }

      addCommentary(`${opp.name} finished all tests!`, true);

      // If user hasn't finished yet — opponent wins
      if (userTests < 5) {
        clearInterval(battleInterval);
        endBattle(false, "opponent");
      }
    }, oppFinishTime);
  }

  // ── Run & Test ──
  document.getElementById("battleRunBtn").addEventListener("click", () => {
    const code = document.getElementById("battleEditor").value;
    const youFill = document.getElementById("youTestsFill");
    const youVal = document.getElementById("youTestsVal");

    let passed = 0;
    if (/name\s*=/.test(code)) passed++;
    if (/age\s*=\s*\d+/.test(code)) passed++;
    if (/print.*name/.test(code)) passed++;
    if (/score\s*=\s*age\s*\*/.test(code)) passed++;
    if (/print.*score/.test(code)) passed++;

    userTests = passed;
    const pct = (passed / 5) * 100;
    youFill.style.width = pct + "%";
    youVal.textContent = `${passed}/5`;

    addCommentary(`You passed ${passed}/5 tests!`);

    if (passed >= 5) {
      // Check if opponent already finished
      if (oppFinished) {
        // Opponent already won — too late
        return;
      }
      clearInterval(battleInterval);
      endBattle(true);
    }
  });

  // ── End battle ──
  function endBattle(youWon, reason = "") {
    showPhase("result");
    const banner = document.getElementById("resultBanner");
    const text = document.getElementById("resultBannerText");

    if (youWon) {
      text.textContent = `You win! 🏆 +50 XP earned`;
      banner.style.background =
        "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.08))";
      banner.style.borderColor = "rgba(124,58,237,0.2)";
      launchConfetti();
      addCommentary("🏆 You won the battle!", true);
    } else if (reason === "opponent") {
      text.textContent = `${opp.name} finished first! Better luck next time. +10 XP`;
      banner.style.background =
        "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))";
      banner.style.borderColor = "rgba(239,68,68,0.2)";
      addCommentary(`${opp.name} won the battle!`, true);
    } else if (reason === "timeout") {
      const oppTests = parseInt(
        document.getElementById("oppTestsVal").textContent.split("/")[0],
      );
      if (userTests >= oppTests) {
        text.textContent = `Time's up! You passed more tests — You win! +25 XP`;
        banner.style.background =
          "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.08))";
        launchConfetti();
      } else {
        text.textContent = `Time's up! ${opp.name} passed more tests. +10 XP`;
        banner.style.background =
          "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))";
      }
    }
  }

  // ── Confetti ──
  function launchConfetti() {
    const canvas = document.getElementById("appConfetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#7c3aed", "#a855f7", "#10b981", "#f59e0b", "#ec4899"];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -100,
      r: 4 + Math.random() * 5,
      d: 1.5 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: 0,
      tiltSpeed: 0.04 + Math.random() * 0.06,
      opacity: 1,
    }));
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        if (p.y > canvas.height || p.opacity <= 0) return;
        alive = true;
        p.tilt += p.tiltSpeed;
        p.y += p.d;
        p.x += Math.sin(p.tilt);
        if (frame > 80) p.opacity -= 0.015;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      frame++;
      if (alive) requestAnimationFrame(draw);
    }
    draw();
  }
});
