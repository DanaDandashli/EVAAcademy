"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── State ──
  let currentStep = 1;

  // Build steps from database tasks
  const steps = TASKS.map((task) => ({
    check: (code) => new RegExp(task.check_regex).test(code),
    hint: task.hint,
    success: `✅ Step ${task.order} complete! Keep going!`,
  }));

  const totalSteps = TOTAL_TASKS;

  // ── Init CodeMirror ──
  const editor = CodeMirror.fromTextArea(
    document.getElementById("codeEditor"),
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

  editor.setValue("# Write your Python code here\n\n");
  setTimeout(() => editor.refresh(), 100);

  // ── Helpers ──
  function updateProgress() {
    const pct = ((currentStep - 1) / totalSteps) * 100;
    document.getElementById("progressFill").style.width = pct + "%";
  }

  function setStepStatus(stepNum, status) {
    const stepEl = document.querySelector(`.app-step[data-step="${stepNum}"]`);
    if (!stepEl) return;

    stepEl.dataset.status = status;
    const dot = stepEl.querySelector(".app-step-dot");
    dot.className = "app-step-dot " + status;

    if (status === "done") {
      dot.innerHTML = '<i class="fas fa-check"></i>';
      stepEl.querySelector(".app-step-label").style.color = "#10b981";
    } else if (status === "active") {
      dot.innerHTML = `<span>${stepNum}</span>`;
    } else {
      dot.innerHTML = '<i class="fas fa-lock"></i>';
    }
  }

  function showXpBadge(stepNum) {
    const badge = document.getElementById(`xp-${stepNum}`);
    if (badge) badge.classList.remove("hidden");
  }

  function floatXP(text) {
    const container = document.getElementById("xpFloatContainer");
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = text;
    el.style.left = Math.random() * 40 + 30 + "%";
    el.style.top = "60%";
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function addEvaMessage(html) {
    const messages = document.getElementById("evaMessages");
    const typing = document.getElementById("evaTyping");

    typing.classList.remove("hidden");
    messages.scrollTop = messages.scrollHeight;

    setTimeout(
      () => {
        typing.classList.add("hidden");
        const div = document.createElement("div");
        div.className = "app-eva-msg";
        div.innerHTML = `
        <div class="app-eva-msg-avatar">
          <img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/>
        </div>
        <div class="app-eva-msg-bubble"><p>${html}</p></div>
      `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
      },
      1000 + Math.random() * 500,
    );
  }

  function launchConfetti() {
    const canvas = document.getElementById("appConfetti");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#7c3aed",
      "#a855f7",
      "#10b981",
      "#f59e0b",
      "#ec4899",
      "#3b82f6",
    ];
    const particles = Array.from({ length: 80 }, () => ({
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

  // ── Run button ──
  document.getElementById("runBtn").addEventListener("click", () => {
    const code = editor.getValue();
    const output = document.getElementById("outputBody");
    const status = document.getElementById("outputStatus");
    const runBtn = document.getElementById("runBtn");
    const hint = document.getElementById("stepHint");

    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;

    setTimeout(() => {
      runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
      runBtn.disabled = false;

      const stepData = steps[currentStep - 1];

      if (stepData.check(code)) {
        // ✅ Step passed
        output.innerHTML = `<span class="adv-out-line cmd">✓ Step ${currentStep} complete!</span>`;
        status.textContent = "● Passed";
        status.className = "app-output-status success";

        setStepStatus(currentStep, "done");
        showXpBadge(currentStep);
        floatXP("+10 XP");
        addEvaMessage(stepData.success);
        hint.textContent = "";

        updateProgress();

        if (currentStep < totalSteps) {
          currentStep++;
          setStepStatus(currentStep, "active");
        } else {
          // All steps done
          launchConfetti();
          floatXP("+40 XP BONUS!");
          document.getElementById("progressFill").style.width = "100%";
          document.getElementById("completeBtn").classList.remove("hidden");
          addEvaMessage(
            "🏆 <strong>You did it!</strong> All steps complete! Click <strong>Complete & Continue</strong> to move on.",
          );
        }
      } else {
        // ❌ Step failed
        output.innerHTML = `<span class="adv-out-line err">Step ${currentStep} not complete yet — check your code.</span>`;
        status.textContent = "● Check again";
        status.className = "app-output-status error";
        hint.textContent = "";

        addEvaMessage(`💡 Not quite! ${stepData.hint}`);
      }
    }, 700);
  });

  // ── Reset ──
  document.getElementById("resetBtn").addEventListener("click", () => {
    editor.setValue("# Write your Python code here\n\n");
    document.getElementById("outputBody").innerHTML =
      '<span class="app-output-placeholder">Run your code to see output...</span>';
    document.getElementById("outputStatus").textContent = "";
    document.getElementById("outputStatus").className = "app-output-status";
    document.getElementById("stepHint").textContent = "";
    document.getElementById("completeBtn").classList.add("hidden");
    document.getElementById("progressFill").style.width = "0%";

    currentStep = 1;
    for (let i = 1; i <= totalSteps; i++) {
      setStepStatus(i, i === 1 ? "active" : "locked");
      const badge = document.getElementById(`xp-${i}`);
      if (badge) badge.classList.add("hidden");
    }
    addEvaMessage(
      "🔄 Reset! Let's start fresh. Begin with Step 1 — " +
        TASKS[0].instruction,
    );
  });

  // ── Init ──
  updateProgress();
  setStepStatus(1, "active");
  addEvaMessage(
    "👋 Welcome! Let's build something together. Start with <strong>Step 1</strong> — " +
      TASKS[0].instruction,
  );
});
