"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── Phases ──
  const phases = {
    matchmaking: document.getElementById("crPhaseMatchmaking"),
    countdown: document.getElementById("crPhaseCountdown"),
    battle: document.getElementById("crPhaseBattle"),
    result: document.getElementById("crPhaseResult"),
  };

  function showPhase(name) {
    Object.values(phases).forEach((p) => p.classList.add("hidden"));
    phases[name].classList.remove("hidden");
  }

  // ── Fake opponents ──
  const opponents = [
    { name: "PyMaster99", level: Math.max(1, USER_LEVEL - 1) },
    { name: "CodeWizard", level: USER_LEVEL },
    { name: "LoopLegend", level: Math.max(1, USER_LEVEL + 1) },
    { name: "ByteNinja", level: USER_LEVEL },
  ];
  const opp = opponents[Math.floor(Math.random() * opponents.length)];

  document.getElementById("oppName").textContent = opp.name;
  document.getElementById("oppMeta").textContent = `Lv.${opp.level}`;
  document.getElementById("oppNameBattle").textContent = opp.name;
  document.getElementById("oppMetaBattle").textContent = `Lv.${opp.level}`;
  document.getElementById("crOppResultName").textContent = opp.name;

  // ── Tasks based on completed topics ──
  const allTasks = [
    {
      title: "Variable Challenge",
      desc: "Create 3 variables: name (string), age (integer), score (float). Print all three.",
      checks: [
        (c) => /\w+\s*=\s*["'][^"']+["']/.test(c),
        (c) => /\w+\s*=\s*\d+/.test(c),
        (c) => /print\s*\(/.test(c),
        (c) => (c.match(/\w+\s*=/g) || []).length >= 3,
        (c) => (c.match(/print\s*\(/g) || []).length >= 2,
      ],
      starter: "# Create your variables here\n\n",
    },
    {
      title: "Control Flow Battle",
      desc: "Write a program that checks if a number is positive, negative, or zero using if/elif/else.",
      checks: [
        (c) => /if\s+.+:/.test(c),
        (c) => /elif\s+.+:/.test(c),
        (c) => /else\s*:/.test(c),
        (c) => /print\s*\(/.test(c),
        (c) => c.split("\n").length >= 6,
      ],
      starter: "# Write your if/elif/else here\nnumber = 10\n\n",
    },
    {
      title: "Loop Master",
      desc: "Use a for loop to print numbers from 1 to 10. Then use a while loop to count down from 5 to 1.",
      checks: [
        (c) => /for\s+\w+\s+in\s+range/.test(c),
        (c) => /while\s+.+:/.test(c),
        (c) => /print\s*\(/.test(c),
        (c) => (c.match(/print\s*\(/g) || []).length >= 2,
        (c) => c.split("\n").length >= 8,
      ],
      starter: "# Write your loops here\n\n",
    },
  ];

  // Pick a random task relevant to completed topics
  const task =
    allTasks[
      Math.floor(
        Math.random() * Math.min(allTasks.length, COMPLETED_TOPICS.length || 1),
      )
    ];

  // ── Init CodeMirror ──
  const editor = CodeMirror.fromTextArea(
    document.getElementById("crCodeEditor"),
    {
      mode: "python",
      theme: "dracula",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: true,
      autofocus: true,
    },
  );
  editor.setValue(task.starter);
  setTimeout(() => {
    editor.refresh();
    editor.focus();
  }, 500);

  // ── Commentary helper ──
  function addComment(text, isSystem = false) {
    const box = document.getElementById("crCommentary");
    const el = document.createElement("p");
    el.className = "cr-comment" + (isSystem ? " system" : "");
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  // ── Start button ──
  document.getElementById("crStartBtn").addEventListener("click", () => {
    showPhase("countdown");

    let count = 3;
    const ring = document.getElementById("crRingFill");
    const num = document.getElementById("crCountdownNum");
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
          document.getElementById("crTaskTitle").textContent = task.title;
          document.getElementById("crTaskDesc").textContent = task.desc;
          addComment(`${opp.name} has joined the battle!`, true);
          addComment("Battle started! Both coders are typing...");
          startBattleTimer();
          simulateOpponent();
          editor.refresh();
        }, 600);
      }
    }, 1000);
  });

  // ── Battle timer ──
  let battleInterval = null;
  let totalSeconds = 300;
  let userTests = 0;
  let oppFinished = false;

  function startBattleTimer() {
    const fill = document.getElementById("crTimerFill");
    const val = document.getElementById("crTimerVal");
    const timerEl = val;

    battleInterval = setInterval(() => {
      totalSeconds--;
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      val.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      fill.style.width = (totalSeconds / 300) * 100 + "%";

      if (totalSeconds <= 60) {
        fill.style.background = "linear-gradient(90deg,#ef4444,#f97316)";
        timerEl.classList.add("urgent");
      }

      if (totalSeconds <= 0) {
        clearInterval(battleInterval);
        const oppTests = parseInt(
          document.getElementById("crOppTests").textContent.split("/")[0],
        );
        const youWon = userTests >= oppTests;
        endBattle(youWon, "timeout");
      }
    }, 1000);
  }

  // ── Simulate opponent ──
  function simulateOpponent() {
    const oppFill = document.getElementById("crOppTestsFill");
    const oppVal = document.getElementById("crOppTests");
    const oppCode = document.getElementById("crOppCode");

    const codeLines = [
      "# Working on solution...",
      "x = 10",
      "if x > 0:",
      '    print("positive")',
      "elif x < 0:",
      '    print("negative")',
      "else:",
      '    print("zero")',
    ];

    let lineIdx = 0;
    let oppTests = 0;
    oppCode.innerHTML = "";

    const oppFinishTime = (80 + Math.random() * 80) * 1000;
    const intervalTime = oppFinishTime / codeLines.length;

    const typeInterval = setInterval(() => {
      if (lineIdx < codeLines.length) {
        const line = document.createElement("div");
        line.style.cssText =
          "font-family:monospace;font-size:0.78rem;color:#e2e8f0;line-height:1.7;";
        line.textContent = codeLines[lineIdx];
        oppCode.appendChild(line);
        lineIdx++;
        oppTests = Math.min(5, Math.floor((lineIdx / codeLines.length) * 5));
        oppFill.style.width = (oppTests / 5) * 100 + "%";
        oppVal.textContent = `${oppTests}/5`;
        if (lineIdx % 2 === 0) addComment(`${opp.name} is making progress...`);
      }
    }, intervalTime);

    setTimeout(() => {
      clearInterval(typeInterval);
      oppFinished = true;
      oppFill.style.width = "100%";
      oppVal.textContent = "5/5";
      document.getElementById("oppStatus").className = "cr-status-pill done";
      document.getElementById("oppStatus").innerHTML =
        '<i class="fas fa-check"></i> Done!';
      addComment(`${opp.name} finished all tests!`, true);

      if (userTests < 5) {
        clearInterval(battleInterval);
        endBattle(false, "opponent");
      }
    }, oppFinishTime);
  }

  // ── Run & Test ──
  document.getElementById("crRunBtn").addEventListener("click", () => {
    const code = editor.getValue();
    const output = document.getElementById("crOutputBody");
    const status = document.getElementById("crOutputStatus");
    const runBtn = document.getElementById("crRunBtn");
    const youFill = document.getElementById("crYouTestsFill");
    const youVal = document.getElementById("crYouTests");

    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;

    setTimeout(() => {
      runBtn.innerHTML = '<i class="fas fa-play"></i> Run & Test';
      runBtn.disabled = false;

      let passed = 0;
      task.checks.forEach((check) => {
        if (check(code)) passed++;
      });
      userTests = passed;

      const pct = (passed / 5) * 100;
      youFill.style.width = pct + "%";
      youVal.textContent = `${passed}/5`;

      output.innerHTML = `<span class="adv-out-line ${passed > 0 ? "cmd" : "err"}">
        ${passed}/${task.checks.length} tests passed
      </span>`;

      if (passed > 0) {
        status.textContent = `● ${passed}/5 passed`;
        status.className = "cr-output-status success";
        addComment(`You passed ${passed}/5 tests!`);
      } else {
        status.textContent = "● No tests passed yet";
        status.className = "cr-output-status error";
      }

      if (passed >= 5) {
        if (oppFinished) return;
        clearInterval(battleInterval);
        endBattle(true, "win");
      }
    }, 700);
  });

  // ── Reset ──
  document.getElementById("crResetBtn").addEventListener("click", () => {
    editor.setValue(task.starter);
    document.getElementById("crOutputBody").innerHTML =
      '<span style="color:#6b7280;font-size:0.82rem;">Run your code to see output...</span>';
    document.getElementById("crOutputStatus").textContent = "";
    document.getElementById("crYouTestsFill").style.width = "0%";
    document.getElementById("crYouTests").textContent = "0/5";
    userTests = 0;
  });

  // ── End battle ──
  function endBattle(youWon, reason) {
    showPhase("result");

    const banner = document.getElementById("crResultBanner");
    const title = document.getElementById("crResultTitle");
    const sub = document.getElementById("crResultSub");
    const youXP = document.getElementById("crYouXP");
    const oppXP = document.getElementById("crOppXP");

    // Update result stats
    document.getElementById("crYouResultTests").textContent = `${userTests}/5`;
    document.getElementById("crYouResultFill").style.width =
      (userTests / 5) * 100 + "%";

    const oppTests = parseInt(
      document.getElementById("crOppTests").textContent.split("/")[0],
    );
    document.getElementById("crOppResultTests").textContent = `${oppTests}/5`;
    document.getElementById("crOppResultFill").style.width =
      (oppTests / 5) * 100 + "%";

    if (youWon) {
      title.textContent = "You Win!";
      sub.textContent = "Amazing coding — you beat your opponent!";
      youXP.textContent = "+50 XP";
      oppXP.textContent = "+10 XP";
      launchConfetti();
    } else if (reason === "opponent") {
      title.textContent = `${opp.name} finished first!`;
      sub.textContent = "Keep practicing — you'll get them next time!";
      youXP.textContent = "+10 XP";
      oppXP.textContent = "+50 XP";
      banner.style.background =
        "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.03))";
    } else {
      title.textContent = "Time's Up!";
      sub.textContent =
        userTests >= oppTests
          ? "You passed more tests — you win!"
          : "Better luck next time!";
      youXP.textContent = userTests >= oppTests ? "+25 XP" : "+10 XP";
      oppXP.textContent = userTests >= oppTests ? "+10 XP" : "+25 XP";
      if (userTests >= oppTests) launchConfetti();
    }

    const csrfToken =
      document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
      document.cookie.match(/csrftoken=([^;]+)/)?.[1] ||
      "";
      
    // Save result to database
    fetch("/compete/result/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": document.cookie.match(/csrftoken=([^;]+)/)?.[1] || "",
      },
      body: JSON.stringify({ won: youWon }),
    });
  }

  // ── Play again ──
  document.getElementById("crPlayAgain").addEventListener("click", () => {
    totalSeconds = 300;
    userTests = 0;
    oppFinished = false;
    document.getElementById("crYouTestsFill").style.width = "0%";
    document.getElementById("crYouTests").textContent = "0/5";
    document.getElementById("crOppTestsFill").style.width = "0%";
    document.getElementById("crOppTests").textContent = "0/5";
    document.getElementById("crTimerFill").style.width = "100%";
    document.getElementById("crTimerVal").textContent = "5:00";
    document.getElementById("crTimerVal").classList.remove("urgent");
    document.getElementById("crTimerFill").style.background = "";
    document.getElementById("crOppCode").innerHTML =
      '<span style="color:#6b7280;font-size:0.82rem;font-family:monospace;">Opponent is typing...</span>';
    editor.setValue(task.starter);
    showPhase("matchmaking");
  });

  // ── Confetti ──
  function launchConfetti() {
    const canvas = document.getElementById("crConfetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#7c3aed", "#a855f7", "#10b981", "#f59e0b", "#ec4899"];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -100,
      r: 4 + Math.random() * 5,
      d: 1.5 + Math.random() * 2.5,
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
