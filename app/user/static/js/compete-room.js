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

  // ── EVA AI opponent ──
  const evaNames = [
    "EVA Challenger",
    "EVA Pro",
    "EVA Elite",
    "EVA Master",
    "EVA Champion",
  ];
  const opp = {
    name: evaNames[Math.floor(Math.random() * evaNames.length)],
    level: USER_LEVEL,
  };

  document.getElementById("oppName").textContent = opp.name;
  document.getElementById("oppMeta").textContent =
    `Lv.${opp.level} · AI Opponent`;
  document.getElementById("oppNameBattle").textContent = opp.name;
  document.getElementById("oppMetaBattle").textContent = `Lv.${opp.level}`;
  document.getElementById("crOppResultName").textContent = opp.name;

  // ── State ──
  let task = null;
  let battleTimer = null;
  let totalSeconds = 600;
  let userSolved = false;
  let oppSolved = false;

  // ── CodeMirror ──
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
  editor.setValue("# EVA is preparing your challenge...\n");
  setTimeout(() => {
    editor.refresh();
    editor.focus();
  }, 500);

  // ── Load EVA Challenge ──
  async function loadEvaChallenge() {
    editor.setValue("# EVA is preparing your challenge...\n");
    try {
      const res = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: `Generate a HARD Python competition challenge based on these completed topics: ${COMPLETED_TOPICS.join(", ") || "Python basics"}.
Return ONLY raw JSON, no markdown:
{"title":"...","description":"...","instruction":"...","starter_code":"# Write your solution here\\n"}`,
          code: "",
          lesson: "Competition",
          eva_context: {},
          mode: "chat",
        }),
      });
      const data = await res.json();
      try {
        const clean = data.reply.replace(/```json|```/g, "").trim();
        task = JSON.parse(clean);
      } catch {
        task = {
          title: "Python Challenge",
          description: data.reply,
          instruction: data.reply,
          starter_code: "# Write your solution here\n\n",
          check_keyword: "def",
        };
      }
      editor.setValue(task.starter_code || "# Write your solution here\n\n");
    } catch {
      task = {
        title: "Python Challenge",
        description:
          "Write a function that takes a list of numbers and returns a new list with only the even numbers, sorted in ascending order.",
        instruction:
          "Write a function that takes a list of numbers and returns a new list with only the even numbers, sorted in ascending order.",
        starter_code:
          "def solution(numbers):\n    # Write your solution here\n    pass\n",
        check_keyword: "def",
      };
      editor.setValue(task.starter_code);
    }
  }

  loadEvaChallenge();

  // ── Commentary ──
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
          document.getElementById("crTaskTitle").textContent =
            task?.title || "Python Challenge";
          document.getElementById("crTaskDesc").textContent =
            task?.instruction || task?.description || "";
          addComment(`${opp.name} has joined the battle!`, true);
          addComment("Battle started! Write your solution and hit Run & Test.");
          startBattleTimer();
          simulateOpponent();
          editor.refresh();
        }, 600);
      }
    }, 1000);
  });

  // ── Battle timer ──
  function startBattleTimer() {
    const fill = document.getElementById("crTimerFill");
    const val = document.getElementById("crTimerVal");
    const maxSecs = totalSeconds;

    battleTimer = setInterval(() => {
      totalSeconds--;
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      val.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      fill.style.width = (totalSeconds / maxSecs) * 100 + "%";

      if (totalSeconds <= 60) {
        fill.style.background = "linear-gradient(90deg,#ef4444,#f97316)";
        val.classList.add("urgent");
      }

      if (totalSeconds <= 0) {
        clearInterval(battleTimer);
        // Time is up — whoever solved wins; if neither, opponent wins
        if (userSolved) {
          endBattle(true, "timeout");
        } else if (oppSolved) {
          endBattle(false, "timeout");
        } else {
          endBattle(false, "timeout");
        }
      }
    }, 1000);
  }

  // ── Simulate EVA opponent ──
  function simulateOpponent() {
    const oppFill = document.getElementById("crOppTestsFill");
    const oppVal = document.getElementById("crOppTests");
    const oppCode = document.getElementById("crOppCode");

    const codeLines = [
      "# Analyzing the problem...",
      "# Planning my approach...",
      "# Writing solution...",
      "# Working on logic...",
      "# Testing edge cases...",
      "# Refining the code...",
      "# Almost done...",
      "# Running final check...",
    ];

    let lineIdx = 0;
    oppCode.innerHTML = "";

    // EVA finishes between 80-160 seconds (hard enough to beat)
    const oppFinishTime = (180 + Math.random() * 180) * 1000;
    const intervalTime = oppFinishTime / codeLines.length;

    const typeInterval = setInterval(() => {
      if (lineIdx < codeLines.length) {
        const line = document.createElement("div");
        line.style.cssText =
          "font-family:monospace;font-size:0.78rem;color:#e2e8f0;line-height:1.7;";
        line.textContent = codeLines[lineIdx];
        oppCode.appendChild(line);
        lineIdx++;
        oppFill.style.width = (lineIdx / codeLines.length) * 100 + "%";
        oppVal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Working...';
        if (lineIdx % 2 === 0) addComment(`${opp.name} is making progress...`);
      }
    }, intervalTime);

    setTimeout(() => {
      clearInterval(typeInterval);
      oppSolved = true;
      oppFill.style.width = "100%";
      oppVal.innerHTML = '<i class="fas fa-check"></i> Solved';
      document.getElementById("oppStatus").className = "cr-status-pill done";
      document.getElementById("oppStatus").innerHTML =
        '<i class="fas fa-check"></i> Done!';
      addComment(`${opp.name} finished the challenge!`, true);

      // If user hasn't solved yet, EVA wins
      if (!userSolved) {
        clearInterval(battleTimer);
        endBattle(false, "opponent");
      }
    }, oppFinishTime);
  }

  // ── Run & Test ──
  document.getElementById("crRunBtn").addEventListener("click", async () => {
    if (userSolved) return; // already solved, ignore

    const code = editor.getValue();
    const output = document.getElementById("crOutputBody");
    const status = document.getElementById("crOutputStatus");
    const runBtn = document.getElementById("crRunBtn");
    const youFill = document.getElementById("crYouTestsFill");
    const youVal = document.getElementById("crYouTests");

    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;

    // ── Run with Skulpt ──
    let outputText = "";
    Sk.configure({
      output: (text) => {
        outputText += text;
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
    } catch (e) {
      output.innerHTML = `<span class="adv-out-line err">${e.toString()}</span>`;
      status.textContent = "● Error in code";
      status.className = "cr-output-status error";
      addComment("There is an error in your code — fix it and try again!");
      runBtn.innerHTML = '<i class="fas fa-play"></i> Run & Test';
      runBtn.disabled = false;
      return;
    }

    // ── Validate with EVA ──
    try {
      const valRes = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: task.instruction,
          code: code,
          output: outputText,
          mode: "validate",
          task_type: "free_code",
        }),
      });
      const valData = await valRes.json();
      const passed = valData.reply?.startsWith("PASS");

      output.innerHTML = `<span class="adv-out-line ${passed ? "cmd" : "err"}">${outputText || "(no output)"}</span>`;
      status.textContent = passed ? "● Solution accepted!" : "● Keep trying...";
      status.className = passed
        ? "cr-output-status success"
        : "cr-output-status error";

      if (passed) {
        userSolved = true;
        youFill.style.width = "100%";
        youVal.innerHTML = '<i class="fas fa-check"></i> Solved';

        // Update your status pill
        document.getElementById("youStatus").className = "cr-status-pill done";
        document.getElementById("youStatus").innerHTML =
          '<i class="fas fa-check"></i> Done!';

        addComment("Great solution! EVA accepted it!", true);

        if (!oppSolved) {
          clearInterval(battleTimer);
          endBattle(true, "win");
        }
        // If opponent already solved — endBattle was already called
      } else {
        youFill.style.width = "30%";
        youVal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> In Progress';
        addComment(valData.reply?.split("\n")[1] || "Not quite — keep going!");
      }
    } catch {
      output.innerHTML = `<span class="adv-out-line err">Validation error — try again</span>`;
    }

    runBtn.innerHTML = '<i class="fas fa-play"></i> Run & Test';
    runBtn.disabled = false;
  });

  // ── Reset ──
  document.getElementById("crResetBtn").addEventListener("click", () => {
    editor.setValue(task?.starter_code || "# Write your solution here\n\n");
    document.getElementById("crOutputBody").innerHTML =
      '<span style="color:#6b7280;font-size:0.82rem;">Run your code to see output...</span>';
    document.getElementById("crOutputStatus").textContent = "";
    document.getElementById("crYouTestsFill").style.width = "0%";
    document.getElementById("crYouTests").textContent = "Pending";
  });

  // ── End battle ──
  function endBattle(youWon, reason) {
    showPhase("result");

    const banner = document.getElementById("crResultBanner");
    const title = document.getElementById("crResultTitle");
    const sub = document.getElementById("crResultSub");
    const youXP = document.getElementById("crYouXP");
    const oppXP = document.getElementById("crOppXP");

    // ── Your result ──
    document.getElementById("crYouResultTests").innerHTML = userSolved
      ? '<i class="fas fa-check" style="color:#06d6a0"></i> Solved'
      : '<i class="fas fa-xmark" style="color:#ef4444"></i> Not solved';
    document.getElementById("crYouResultFill").style.width = userSolved
      ? "100%"
      : "0%";

    // ── Opponent result ──
    document.getElementById("crOppResultTests").innerHTML = oppSolved
      ? '<i class="fas fa-check" style="color:#06d6a0"></i> Solved'
      : '<i class="fas fa-xmark" style="color:#ef4444"></i> Not solved';
    document.getElementById("crOppResultFill").style.width = oppSolved
      ? "100%"
      : "0%";

    // ── Result message and XP ──
    if (youWon) {
      title.textContent = "You Win!";
      sub.textContent = "Excellent coding — you beat EVA AI!";
      youXP.textContent = "+50 XP";
      oppXP.textContent = "+0 XP";
      title.style.color = "#008080";
      banner.style.background =
        "linear-gradient(135deg, rgba(6,214,160,0.08), rgba(6,214,160,0.04))";
      launchConfetti();
    } else if (reason === "opponent") {
      title.textContent = `${opp.name} finished first!`;
      sub.textContent = "Keep practicing — you'll get it next time!";
      youXP.textContent = "+0 XP";
      oppXP.textContent = "+50 XP";
      title.style.color = "#9e0909";
      banner.style.background =
        "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.03))";
    } else {
      // timeout
      if (userSolved && !oppSolved) {
        title.textContent = "You Win!";
        sub.textContent = "Time's up — you solved it before EVA!";
        youXP.textContent = "+25 XP";
        oppXP.textContent = "+0 XP";
        title.style.color = "#008080";
        banner.style.background =
          "linear-gradient(135deg, rgba(6,214,160,0.08), rgba(6,214,160,0.04))";
        launchConfetti();
      } else {
        title.textContent = "Time's Up!";
        sub.textContent =
          "Neither solved it in time — better luck next battle!";
        youXP.textContent = "+0 XP";
        oppXP.textContent = "+0 XP";
        title.style.color = "#9e0909";
        banner.style.background =
          "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.03))";
      }
    }

    // ── Save result to DB ──
    fetch("/compete/result/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
      },
      body: JSON.stringify({ won: youWon }),
    });
  }

  // ── View EVA Solution ──
  document
    .getElementById("crViewSolution")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("crViewSolution");
      btn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> EVA is preparing...';
      btn.disabled = true;

      try {
        const res = await fetch("/advisor/chat/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": CSRF_TOKEN,
          },
          body: JSON.stringify({
            message: task?.instruction || "Python challenge",
            code: "",
            lesson: "Competition",
            eva_context: {},
            mode: "solution",
          }),
        });
        const data = await res.json();

        const modal = document.getElementById("crSolutionModal");
        const content = document.getElementById("crSolutionContent");
        if (modal && content) {
          content.innerHTML = data.reply
            .replace(
              /```python([\s\S]*?)```/g,
              '<pre style="background:#0d0d0d;color:#ffffff;border-radius:8px;padding:12px;font-family:monospace;font-size:0.82rem;white-space:pre-wrap;overflow-x:auto;margin:8px 0;">$1</pre>',
            )
            .replace(
              /```([\s\S]*?)```/g,
              '<pre style="background:#0d0d0d;color:#ffffff;border-radius:8px;padding:12px;font-family:monospace;font-size:0.82rem;white-space:pre-wrap;margin:8px 0;">$1</pre>',
            )
            .replace(/\n/g, "<br>");
          modal.style.display = "flex";
        }
      } catch {
        addComment("Could not load EVA solution — try again.");
      }

      btn.innerHTML = '<i class="fas fa-graduation-cap"></i> View EVA Solution';
      btn.disabled = false;
    });

  // ── Play again ──
  document.getElementById("crPlayAgain").addEventListener("click", async () => {
    // Reset state
    totalSeconds = 600;
    userSolved = false;
    oppSolved = false;

    // Reset UI
    document.getElementById("crYouTestsFill").style.width = "0%";
    document.getElementById("crYouTests").textContent = "Pending";
    document.getElementById("crOppTestsFill").style.width = "0%";
    document.getElementById("crOppTests").textContent = "Pending";
    document.getElementById("crTimerFill").style.width = "100%";
    document.getElementById("crTimerFill").style.background = "";
    document.getElementById("crTimerVal").textContent = "5:00";
    document.getElementById("crTimerVal").classList.remove("urgent");
    document.getElementById("crOutputBody").innerHTML =
      '<span style="color:#6b7280;font-size:0.82rem;">Run your code to see output...</span>';
    document.getElementById("crOutputStatus").textContent = "";
    document.getElementById("crCommentary").innerHTML =
      '<p style="font-size:0.78rem;color:#9ca3af;text-align:center;">Battle starting...</p>';
    document.getElementById("crOppCode").innerHTML =
      '<span style="color:#6b7280;font-size:0.82rem;font-family:monospace;">Opponent is typing...</span>';
    document.getElementById("youStatus").className = "cr-status-pill coding";
    document.getElementById("youStatus").innerHTML =
      '<i class="fas fa-code"></i> Coding...';
    document.getElementById("oppStatus").className = "cr-status-pill coding";
    document.getElementById("oppStatus").innerHTML =
      '<i class="fas fa-code"></i> Coding...';

    // Pick new EVA name
    const newName = evaNames[Math.floor(Math.random() * evaNames.length)];
    opp.name = newName;
    document.getElementById("oppName").textContent = opp.name;
    document.getElementById("oppMeta").textContent =
      `Lv.${opp.level} · AI Opponent`;
    document.getElementById("oppNameBattle").textContent = opp.name;
    document.getElementById("crOppResultName").textContent = opp.name;

    // Load new challenge
    await loadEvaChallenge();
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
