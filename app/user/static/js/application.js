"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── State ──
  let currentTask = TASKS[0] || null;
  let taskNumber = 1;
  let failCount = 0;
  let passCount = 0;
  const CSRF_TOKEN =
    document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";

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

  if (currentTask) {
    editor.setValue(
      currentTask.starter_code || "# Write your Python code here\n\n",
    );
  }
  setTimeout(() => editor.refresh(), 100);

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

  // ── Display output ──
  function showOutput(output, error) {
    const body = document.getElementById("outputBody");
    const status = document.getElementById("outputStatus");
    body.innerHTML = "";

    const cmdEl = document.createElement("div");
    cmdEl.className = "adv-out-line cmd";
    cmdEl.textContent = "$ python main.py";
    body.appendChild(cmdEl);

    if (output) {
      output.split("\n").forEach((line) => {
        if (!line) return;
        const el = document.createElement("div");
        el.className = "adv-out-line cmd";
        el.textContent = line;
        body.appendChild(el);
      });
    }

    if (error) {
      error.split("\n").forEach((line) => {
        if (!line) return;
        const el = document.createElement("div");
        el.className = "adv-out-line err";
        el.textContent = line;
        body.appendChild(el);
      });
      status.textContent = "error";
      status.className = "app-output-status error";
    } else {
      status.textContent = "done";
      status.className = "app-output-status success";
    }
  }

  // ── Update left panel ──
  function updateStepsPanel() {
    const list = document.getElementById("stepsList");
    if (!list) return;
    list.innerHTML = "";

    for (let i = 1; i < taskNumber; i++) {
      const div = document.createElement("div");
      div.className = "app-step";
      div.innerHTML = `
        <div class="app-step-indicator">
          <div class="app-step-dot done"><i class="fas fa-check"></i></div>
        </div>
        <div class="app-step-content">
          <span class="app-step-label" style="color:#10b981">Step ${i} — Complete</span>
        </div>`;
      list.appendChild(div);
    }

    if (currentTask) {
      const div = document.createElement("div");
      div.className = "app-step";
      div.innerHTML = `
        <div class="app-step-indicator">
          <div class="app-step-dot active"><span>${taskNumber}</span></div>
        </div>
        <div class="app-step-content">
          <span class="app-step-label" style="color:var(--primary)">Step ${taskNumber} — Current</span>
          <p class="app-step-task">${currentTask.instruction}</p>
          ${failCount >= 2 ? '<p style="font-size:0.78rem;color:#f59e0b;margin-top:6px;">💡 ' + currentTask.hint + "</p>" : ""}
        </div>`;
      list.appendChild(div);
    }

    const pct = ((taskNumber - 1) / Math.max(taskNumber, 3)) * 100;
    const fill = document.getElementById("progressFill");
    if (fill) fill.style.width = pct + "%";
  }

  // ── EVA simple message ──
  async function addEvaAIMessage(userContext) {
    const messages = document.getElementById("evaMessages");
    const typing = document.getElementById("evaTyping");
    if (!messages || !typing) return;

    typing.classList.remove("hidden");
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: userContext,
          code: editor.getValue(),
          lesson: document.title || "Python",
          eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
          is_greeting: false,
        }),
      });

      const data = await response.json();
      typing.classList.add("hidden");

      const div = document.createElement("div");
      div.className = "app-eva-msg";
      div.innerHTML = `
        <div class="app-eva-msg-avatar">
          <img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/>
        </div>
        <div class="app-eva-msg-bubble"><p>${data.reply || "Keep going!"}</p></div>`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    } catch (err) {
      typing.classList.add("hidden");
    }
  }

  // ── EVA validation ──
  async function askEvaToValidate(instruction, code, output) {
    const messages = document.getElementById("evaMessages");
    const typing = document.getElementById("evaTyping");
    if (!messages || !typing) return { passed: false };

    typing.classList.remove("hidden");
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: instruction,
          code: code,
          output: output,
          mode: "validate",
          lesson: document.title || "Python",
          eva_context: typeof EVA_CONTEXT !== "undefined" ? EVA_CONTEXT : {},
          is_greeting: false,
        }),
      });

      const data = await response.json();
      const reply = data.reply || "";
      const lines = reply.split("\n").filter((l) => l.trim());
      const first = lines[0]?.trim().toUpperCase();
      const feedback = lines.slice(1).join(" ").trim() || reply;

      typing.classList.add("hidden");

      const div = document.createElement("div");
      div.className = "app-eva-msg";
      div.innerHTML = `
        <div class="app-eva-msg-avatar">
          <img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/>
        </div>
        <div class="app-eva-msg-bubble"><p>${feedback}</p></div>`;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;

      return { passed: first === "PASS", reply: feedback };
    } catch (err) {
      typing.classList.add("hidden");
      return { passed: false, reply: "Having trouble connecting. Try again!" };
    }
  }

  // ── XP float ──
  function floatXP(text) {
    const container = document.getElementById("xpFloatContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = text;
    el.style.left = Math.random() * 40 + 30 + "%";
    el.style.top = "60%";
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
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

  // ── Load next task ──
  async function loadNextTask() {
    try {
      const response = await fetch("/lesson/" + SECTION_ID + "/next-task/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          passed_task_order: taskNumber,
          code: editor.getValue(),
        }),
      });

      const data = await response.json();

      if (data.complete) {
        launchConfetti();
        floatXP("+30 XP BONUS!");
        document.getElementById("progressFill").style.width = "100%";
        document.getElementById("completeBtn").classList.remove("hidden");
        addEvaAIMessage(
          "The student has completed all application tasks successfully. Congratulate them warmly in 2 sentences and tell them they are ready for the next challenge.",
        );
        return;
      }

      currentTask = data.task;
      taskNumber++;
      failCount = 0;
      passCount++;

      editor.setValue(currentTask.starter_code || "# Write your code here\n\n");
      updateStepsPanel();
      addEvaAIMessage(
        "The student just passed a task. Congratulate them in 1 sentence and encourage them to try the next challenge shown on the left panel. Do NOT write code or repeat the task.",
      );
    } catch (err) {
      console.error("Error loading next task:", err);
    }
  }

  // ── Run button ──
  document.getElementById("runBtn").addEventListener("click", async () => {
    if (!currentTask) return;

    const runBtn = document.getElementById("runBtn");
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;

    const code = editor.getValue();
    const result = await runCode(code);

    showOutput(result.output, result.error);

    runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
    runBtn.disabled = false;

    if (result.error) {
      failCount++;
      await askEvaToValidate(
        currentTask.instruction,
        code,
        "ERROR: " + result.error,
      );
      updateStepsPanel();
      return;
    }

    const validation = await askEvaToValidate(
      currentTask.instruction,
      code,
      result.output,
    );

    if (validation.passed) {
      floatXP("+10 XP");
      passCount++;
      failCount = 0;
      updateStepsPanel();
      await loadNextTask();
    } else {
      failCount++;
      updateStepsPanel();
    }
  });

  // ── Reset ──
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (currentTask) {
      editor.setValue(currentTask.starter_code || "# Write your code here\n\n");
    }
    document.getElementById("outputBody").innerHTML =
      '<span class="app-output-placeholder">Run your code to see output...</span>';
    document.getElementById("outputStatus").textContent = "";
    addEvaAIMessage(
      "The student reset their code. Encourage them to try again in 1 sentence.",
    );
  });

  // ── Initialize ──
  updateStepsPanel();
  if (currentTask) {
    addEvaAIMessage(
      "Greet the student warmly in 1 sentence. Tell them EVA is here to help if they get stuck. Do NOT mention the task, do NOT write any code.",
    );
  }
});
