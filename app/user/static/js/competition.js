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

  // ── Set opponent info ──
  document.getElementById("oppName").textContent = OPP_NAME;
  document.getElementById("oppMeta").textContent =
    "Lv." + OPP_LEVEL + " · AI Opponent";
  document.getElementById("oppNameBattle").textContent = OPP_NAME;
  document.getElementById("oppMetaBattle").textContent = "Lv." + OPP_LEVEL;

  // ── Init CodeMirror ──
  let battleEditor = null;
  const battleTextarea = document.getElementById("battleEditor");
  if (battleTextarea && typeof CodeMirror !== "undefined") {
    battleEditor = CodeMirror.fromTextArea(battleTextarea, {
      mode: "python",
      theme: "dracula",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: true,
    });
    battleEditor.setValue("# Write your solution here\n\n");
  }

  // ── Commentary helper ──
  function addCommentary(text, isSystem) {
    isSystem = isSystem || false;
    const list = document.getElementById("competeCommentary");
    const li = document.createElement("li");
    li.className = "commentary-item" + (isSystem ? " system" : "") + " new";
    li.innerHTML = isSystem
      ? '<div class="commentary-sys-icon"><i class="fas fa-circle-info"></i></div><p>' +
        text +
        "</p>"
      : '<div class="commentary-sys-icon" style="background:rgba(0,128,128,0.1)"><i class="fas fa-eye" style="color:var(--primary)"></i></div><p>' +
        text +
        "</p>";
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
  }

  // ── Show output ──
  function showOutput(output, error) {
    const outputBody = document.getElementById("battleOutputBody");
    const outputStatus = document.getElementById("battleOutputStatus");
    if (!outputBody) return;

    outputBody.innerHTML = "";

    const cmdEl = document.createElement("div");
    cmdEl.className = "adv-out-line cmd";
    cmdEl.textContent = "$ python main.py";
    outputBody.appendChild(cmdEl);

    if (output) {
      output.split("\n").forEach((line) => {
        if (!line) return;
        const el = document.createElement("div");
        el.className = "adv-out-line cmd";
        el.textContent = line;
        outputBody.appendChild(el);
      });
    }

    if (error) {
      error.split("\n").forEach((line) => {
        if (!line) return;
        const el = document.createElement("div");
        el.className = "adv-out-line err";
        el.textContent = line;
        outputBody.appendChild(el);
      });
      if (outputStatus) {
        outputStatus.textContent = "error";
        outputStatus.className = "app-output-status error";
      }
    } else {
      if (outputStatus) {
        outputStatus.textContent = "done";
        outputStatus.className = "app-output-status success";
      }
    }
  }

  // ── Skulpt execution ──
  function runCode(code) {
    return new Promise((resolve) => {
      let output = "";
      function outf(text) {
        output += text;
      }
      function builtinRead(x) {
        if (
          Sk.builtinFiles === undefined ||
          Sk.builtinFiles["files"][x] === undefined
        )
          throw "File not found: " + x;
        return Sk.builtinFiles["files"][x];
      }
      Sk.configure({ output: outf, read: builtinRead });
      Sk.misceval
        .asyncToPromise(() =>
          Sk.importMainWithBody("<stdin>", false, code, true),
        )
        .then(() => resolve({ output, error: null }))
        .catch((err) => resolve({ output, error: err.toString() }));
    });
  }

  // ── Validate with EVA ──
  async function validateSolution(code, output) {
    if (!CHALLENGE || !CHALLENGE.instruction) return false;
    try {
      const response = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: CHALLENGE.instruction,
          code: code,
          output: output,
          mode: "validate",
          eva_context: {},
          is_greeting: false,
        }),
      });
      const data = await response.json();
      const first = data.reply?.split("\n")[0]?.trim().toUpperCase();
      return first === "PASS";
    } catch (err) {
      return false;
    }
  }

  // ── Hint button ──
  let hintUsed = false;
  document.getElementById("hintBtn")?.addEventListener("click", async () => {
    if (hintUsed) return;
    hintUsed = true;

    const hintBtn = document.getElementById("hintBtn");
    const hintText = document.getElementById("hintText");
    hintBtn.disabled = true;
    hintBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> EVA is thinking...';

    try {
      const response = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message:
            'Give ONE Socratic hint for this challenge: "' +
            CHALLENGE.instruction +
            '". No code. One guiding question only.',
          code: battleEditor ? battleEditor.getValue() : "",
          lesson: "Python",
          eva_context: {},
          is_greeting: false,
        }),
      });
      const data = await response.json();
      hintText.textContent =
        data.reply ||
        "Think about what concepts you learned in the Introduction...";
      hintText.style.display = "block";
      hintBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Hint Used';
      addCommentary("EVA gave you a hint — use it wisely!");
    } catch (err) {
      hintBtn.disabled = false;
      hintBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Need a Hint?';
    }
  });

  // ── Markdown parser ──
  function parseMarkdown(text) {
    return text
      .replace(
        /```python\n?([\s\S]*?)```/g,
        '<pre style="background:#1a1a2e;border-radius:8px;padding:12px;color:#e2e8f0;font-family:monospace;font-size:0.82rem;line-height:1.7;white-space:pre-wrap;margin:8px 0;">$1</pre>',
      )
      .replace(
        /```\n?([\s\S]*?)```/g,
        '<pre style="background:#1a1a2e;border-radius:8px;padding:12px;color:#e2e8f0;font-family:monospace;font-size:0.82rem;line-height:1.7;white-space:pre-wrap;margin:8px 0;">$1</pre>',
      )
      .replace(
        /`([^`]+)`/g,
        '<code style="background:rgba(0,128,128,0.1);color:#008080;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.82rem;">$1</code>',
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  // ── Solution modal ──
  document.getElementById("viewSolutionBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("solutionModal");
    if (modal) modal.style.display = "flex";
  });

  document
    .getElementById("closeSolutionModal")
    ?.addEventListener("click", () => {
      const modal = document.getElementById("solutionModal");
      if (modal) modal.style.display = "none";
    });

  // ── Fetch and show solution ──
  async function showSolutionReview() {
    const solutionContent = document.getElementById("solutionContent");
    if (!solutionContent) return;

    // Show View Solution button
    const viewBtn = document.getElementById("viewSolutionBtn");
    if (viewBtn) viewBtn.style.display = "flex";

    try {
      const response = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message:
            'Provide the solution for: "' +
            CHALLENGE.instruction +
            '". Show the Python code in a code block, then explain each line simply in 2-3 sentences. Keep it encouraging and educational.',
          code: "",
          lesson: "Python",
          eva_context: {},
          is_greeting: false,
        }),
      });
      const data = await response.json();
      const reply = data.reply || "";
      solutionContent.innerHTML = parseMarkdown(reply);
    } catch (err) {
      solutionContent.textContent =
        "Solution unavailable. Practice the challenge again!";
    }
  }

  // ── Start battle ──
  document.getElementById("competeStartBtn").addEventListener("click", () => {
    showPhase("countdown");
    addCommentary(OPP_NAME + " is ready for the challenge!", true);

    if (CHALLENGE && CHALLENGE.instruction) {
      const taskDesc = document.querySelector(".compete-task-desc");
      if (taskDesc) taskDesc.textContent = CHALLENGE.instruction;
    }

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
          if (battleEditor) battleEditor.refresh();

          const hintSection = document.getElementById("hintSection");
          if (hintSection) hintSection.style.display = "block";

          addCommentary(
            "Battle started! Both coders are working on the challenge...",
            true,
          );
          startBattleTimer();
          simulateOpponent();
        }, 600);
      }
    }, 1000);
  });

  // ── Battle timer ──
  let battleInterval = null;
  let totalSeconds =
    CHALLENGE && CHALLENGE.time_limit ? CHALLENGE.time_limit : 300;
  let userPassed = false;
  let oppFinished = false;

  function startBattleTimer() {
    const fill = document.getElementById("battleTimerFill");
    const val = document.getElementById("battleTimerVal");
    const maxSeconds = totalSeconds;

    battleInterval = setInterval(() => {
      totalSeconds--;
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      val.textContent = m + ":" + s.toString().padStart(2, "0");
      fill.style.width = (totalSeconds / maxSeconds) * 100 + "%";

      if (totalSeconds / maxSeconds < 0.3) {
        fill.style.background = "linear-gradient(90deg,#ef4444,#f97316)";
      }

      if (totalSeconds <= 0) {
        clearInterval(battleInterval);
        if (!userPassed) endBattle(false, "timeout");
      }
    }, 1000);
  }

  // ── Simulate AI opponent ──
  function simulateOpponent() {
    const oppFill = document.getElementById("oppTestsFill");
    const oppVal = document.getElementById("oppTestsVal");
    const oppCode = document.getElementById("oppCodeView");

    const maxTime =
      CHALLENGE && CHALLENGE.time_limit ? CHALLENGE.time_limit : 300;
    const oppFinishMs = maxTime * (0.6 + Math.random() * 0.3) * 1000;

    let progress = 0;
    let progressMsgCount = 0;

    const progressInterval = setInterval(() => {
      progress = Math.min(100, progress + 100 / (oppFinishMs / 500));
      oppFill.style.width = progress + "%";

      if (progress < 30) {
        oppCode.innerHTML =
          '<div style="font-family:monospace;font-size:0.82rem;color:#e2e8f0;line-height:1.7"># Working on the challenge...</div>';
      } else if (progress >= 60 && progress < 65) {
        oppCode.innerHTML =
          '<div style="font-family:monospace;font-size:0.82rem;color:#e2e8f0;line-height:1.7"># Almost done...</div>';
      }

      if (progress >= 30 && progress < 32 && progressMsgCount === 0) {
        addCommentary(OPP_NAME + " is making progress...");
        progressMsgCount++;
      } else if (progress >= 70 && progress < 72 && progressMsgCount === 1) {
        addCommentary(OPP_NAME + " is almost finished!");
        progressMsgCount++;
      }
    }, 500);

    setTimeout(() => {
      clearInterval(progressInterval);
      oppFinished = true;
      oppFill.style.width = "100%";
      oppVal.textContent = "Done";

      const statusEl = document.getElementById("oppStatusCoding");
      if (statusEl) {
        statusEl.className = "compete-status-pill done";
        statusEl.innerHTML = '<i class="fas fa-check"></i> Done!';
      }

      addCommentary(OPP_NAME + " has completed the challenge!", true);

      if (!userPassed) {
        clearInterval(battleInterval);
        endBattle(false, "opponent");
      }
    }, oppFinishMs);
  }

  // ── Run & Test button ──
  document
    .getElementById("battleRunBtn")
    .addEventListener("click", async () => {
      if (userPassed) return;

      const runBtn = document.getElementById("battleRunBtn");
      const userFill = document.getElementById("youTestsFill");
      const userVal = document.getElementById("youTestsVal");

      runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
      runBtn.disabled = true;

      const code = battleEditor
        ? battleEditor.getValue()
        : document.getElementById("battleEditor").value;
      const result = await runCode(code);

      showOutput(result.output, result.error);

      runBtn.innerHTML = '<i class="fas fa-play"></i> Run & Test';
      runBtn.disabled = false;

      if (result.error) {
        if(userFill) userFill.style.width = "25%";
        if(userVal) userVal.textContent = "Has errors";
        addCommentary("There is an error in your code. Fix it and try again!");
        return;
      }

      // Code ran without errors, now validate the solution
      if(userFill) userFill.style.width = "50%";
      if(userVal) userVal.textContent = "Testing...";

      runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
      runBtn.disabled = true;

      const passed = await validateSolution(code, result.output);

      runBtn.innerHTML = '<i class="fas fa-play"></i> Run & Test';
      runBtn.disabled = false;

      if (passed) {
        userPassed = true;
        if (userFill) userFill.style.width = "100%";
        if (userVal) userVal.textContent = "Done";

        const youStatus = document.getElementById("youStatusCoding");
        if (youStatus) {
          youStatus.className = "compete-status-pill done";
          youStatus.innerHTML = '<i class="fas fa-check"></i> Done!';
        }

        clearInterval(battleInterval);
        endBattle(!oppFinished, "user");
      } else {
        if (userFill) userFill.style.width = "75%";
        if (userVal) userVal.textContent = "Keep trying";
        addCommentary("Not quite right. Keep trying, you can do it!");
      }
    });

  // ── End battle ──
  function endBattle(youWon, reason) {
    showPhase("result");
    showSolutionReview();

    // Hide hint section
    const hintSection = document.getElementById("hintSection");
    if (hintSection) hintSection.style.display = "none";
    
    const banner = document.getElementById("resultBanner");
    const text = document.getElementById("resultBannerText");

    if (youWon) {
      text.textContent = "You won the battle! +50 XP";
      banner.style.background =
        "linear-gradient(135deg, rgba(0,128,128,0.1), rgba(0,160,160,0.08))";
      banner.style.borderColor = "rgba(0,128,128,0.2)";
      launchConfetti();
      addCommentary("You won the challenge! Excellent coding!", true);
    } else if (reason === "opponent") {
      text.textContent = OPP_NAME + " finished first. Keep practicing! +10 XP";
      banner.style.background =
        "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))";
      banner.style.borderColor = "rgba(239,68,68,0.2)";
      addCommentary(
        OPP_NAME + " won this round. Click View Solution to learn!",
        true,
      );
    } else {
      text.textContent = "Time is up! Keep practicing. +10 XP";
      banner.style.background =
        "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))";
      banner.style.borderColor = "rgba(239,68,68,0.2)";
      addCommentary(
        "Time ran out. Click View Solution to learn the approach!",
        true,
      );
    }
  }

  // ── Confetti ──
  function launchConfetti() {
    const canvas = document.getElementById("appConfetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#008080",
      "#00a0a0",
      "#10b981",
      "#f59e0b",
      "#ec4899",
      "#3b82f6",
    ];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -100,
      r: 4 + Math.random() * 6,
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
        if (p.y > canvas.height + 20 || p.opacity <= 0) return;
        alive = true;
        p.tilt += p.tiltSpeed;
        p.y += p.d;
        p.x += Math.sin(p.tilt) * 1.5;
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
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
  }

  // ── Initialize ──
  addCommentary(
    "Welcome to the Competition Arena! Click Start Battle when ready.",
    true,
  );
});
