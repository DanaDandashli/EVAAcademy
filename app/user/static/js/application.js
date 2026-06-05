"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── State ──
  let taskNumber = PASSED_COUNT + 1;
  let currentTask = TASKS[0] || null;
  let failCount = 0;
  const CSRF_TOKEN =
    document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";

  // ── CodeMirror editors ──
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

  const bugEditor = CodeMirror.fromTextArea(
    document.getElementById("bugEditor"),
    {
      mode: "python",
      theme: "dracula",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: true,
    },
  );

  setTimeout(() => {
    editor.refresh();
    bugEditor.refresh();
  }, 100);

  // ── Panel switching ──
  function showPanel(taskType) {
    ["panelFreeCode", "panelFillBlank", "panelBugFix"].forEach((id) =>
      document.getElementById(id).classList.add("hidden"),
    );
    if (taskType === "fill_blank") {
      document.getElementById("panelFillBlank").classList.remove("hidden");
    } else if (taskType === "bug_fix") {
      document.getElementById("panelBugFix").classList.remove("hidden");
      setTimeout(() => bugEditor.refresh(), 100);
    } else {
      document.getElementById("panelFreeCode").classList.remove("hidden");
      setTimeout(() => editor.refresh(), 100);
    }
  }

  // ── Task meta badges ──
  function updateTaskMeta(task) {
    const typeMap = {
      free_code: { label: "Free Code", icon: "fa-code", cls: "free" },
      fill_blank: {
        label: "Fill in the Blank",
        icon: "fa-pen-to-square",
        cls: "fill",
      },
      bug_fix: { label: "Bug Fix", icon: "fa-bug", cls: "bug" },
    };
    const diffMap = {
      easy: { label: "Easy", cls: "easy" },
      medium: { label: "Medium", cls: "medium" },
      hard: { label: "Hard", cls: "hard" },
      expert: { label: "Expert", cls: "expert" },
    };
    const type = typeMap[task.task_type] || typeMap.free_code;
    const diff = diffMap[task.difficulty] || diffMap.easy;
    const typeBadge = document.getElementById("taskTypeBadge");
    const diffBadge = document.getElementById("taskDiffBadge");
    typeBadge.innerHTML = `<i class="fas ${type.icon}"></i> ${type.label}`;
    typeBadge.className = `task-type-badge ${type.cls}`;
    diffBadge.innerHTML = `<i class="fas fa-signal"></i> ${diff.label}`;
    diffBadge.className = `task-diff-badge ${diff.cls}`;
  }

  // ── Load task into UI ──
  function loadTaskUI(task) {
    if (!task) return;
    updateTaskMeta(task);
    showPanel(task.task_type);
    if (task.task_type === "fill_blank") {
      const code = task.code_template || task.starter_code || "";
      const parts = code.split("_____");
      const el = document.getElementById("fillBlankCode");
      el.innerHTML = "";
      parts.forEach((part, i) => {
        const span = document.createElement("span");
        span.className = "fill-code-text";
        span.textContent = part;
        el.appendChild(span);
        if (i < parts.length - 1) {
          const blank = document.createElement("span");
          blank.className = "fill-blank-gap";
          blank.textContent = "_____";
          el.appendChild(blank);
        }
      });
      document.getElementById("fillBlankInput").value = "";
      document.getElementById("fillFeedback").textContent = "";
      document.getElementById("fillBlankHint").textContent = "";
    } else if (task.task_type === "bug_fix") {
      bugEditor.setValue(
        task.code_template || task.starter_code || "# Buggy code here\n",
      );
      document.getElementById("bugOutputBody").innerHTML =
        '<span class="app-output-placeholder">Run your fixed code to test it...</span>';
      document.getElementById("bugOutputStatus").textContent = "";
    } else {
      editor.setValue(task.starter_code || "# Write your solution here\n\n");
      document.getElementById("outputBody").innerHTML =
        '<span class="app-output-placeholder">Run your code to see output...</span>';
      document.getElementById("outputStatus").textContent = "";
    }
  }

  // ── Skulpt execution ──
  function runCode(code) {
    return new Promise((resolve) => {
      let output = "";
      Sk.configure({
        output: (text) => {
          output += text;
        },
        read: (x) => {
          if (Sk.builtinFiles?.["files"][x] === undefined)
            throw "File not found: " + x;
          return Sk.builtinFiles["files"][x];
        },
        inputfun: (prompt) =>
          new Promise((res) => {
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
              res(field.value);
            }
            function onEnter(e) {
              if (e.key === "Enter") submit();
            }
            btn.addEventListener("click", submit);
            field.addEventListener("keydown", onEnter);
          }),
        inputfunTakesPrompt: true,
      });
      Sk.misceval
        .asyncToPromise(() =>
          Sk.importMainWithBody("<stdin>", false, code, true),
        )
        .then(() => resolve({ output, error: null }))
        .catch((err) => resolve({ output, error: err.toString() }));
    });
  }

  // ── Display output ──
  function showOutput(bodyId, statusId, output, error) {
    const body = document.getElementById(bodyId);
    const status = document.getElementById(statusId);
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

  // ── Steps panel ──
  function updateStepsPanel() {
    const list = document.getElementById("stepsList");
    if (!list) return;
    list.innerHTML = "";
    const typeIcons = {
      free_code: "fa-code",
      fill_blank: "fa-pen-to-square",
      bug_fix: "fa-bug",
    };
    for (let i = 1; i < taskNumber; i++) {
      const div = document.createElement("div");
      div.className = "app-step";
      div.innerHTML = `
        <div class="app-step-indicator">
          <div class="app-step-dot done"><i class="fas fa-check"></i></div>
        </div>
        <div class="app-step-content">
          <span class="app-step-label" style="color:#10b981">
            Step ${i} — Complete
          </span>
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
          <span class="app-step-label" style="color:var(--primary)">
            <i class="fas ${typeIcons[currentTask.task_type] || "fa-code"} fa-xs"></i>
            Step ${taskNumber} — Current
          </span>
          <p class="app-step-task">${currentTask.instruction}</p>
          ${failCount >= 2 ? `<p class="app-step-hint-text">💡 ${currentTask.hint}</p>` : ""}
        </div>`;
      list.appendChild(div);
    }
    const pct = Math.min(
      Math.round(((taskNumber - 1) / TOTAL_TASKS) * 100),
      99,
    );
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    if (fill) fill.style.width = pct + "%";
    if (label) label.textContent = pct + "% Complete";
  }

  // ── EVA message ──
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
          code: "",
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
    } catch {
      typing.classList.add("hidden");
    }
  }

  // ── Validate with dedicated validator ──
  async function validateCode(code, output) {
    const typing = document.getElementById("evaTyping");
    if (typing) typing.classList.remove("hidden");
    try {
      const response = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: currentTask.instruction,
          code,
          output,
          mode: "validate",
          task_type: currentTask.task_type,
          correct_answer: currentTask.correct_answer,
          fail_count: failCount,
          lesson: document.title || "Python",
          eva_context: {},
          is_greeting: false,
        }),
      });
      const data = await response.json();
      const reply = data.reply || "";
      const lines = reply.split("\n").filter((l) => l.trim());
      const verdict = lines[0]?.trim().toUpperCase();
      const feedback = lines.slice(1).join(" ").trim() || reply;
      if (typing) typing.classList.add("hidden");

      // Show feedback in EVA
      const messages = document.getElementById("evaMessages");
      if (messages) {
        const div = document.createElement("div");
        div.className = "app-eva-msg";
        div.innerHTML = `
          <div class="app-eva-msg-avatar">
            <img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/>
          </div>
          <div class="app-eva-msg-bubble"><p>${feedback}</p></div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
      }
      return verdict === "PASS";
    } catch {
      if (typing) typing.classList.add("hidden");
      return false;
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

  // ── On task pass ──
  async function onTaskPassed(code) {
    floatXP("+5 XP");
    failCount = 0;
    await loadNextTask(code);
  }

  // ── Load next task from server ──
  async function loadNextTask(code) {
    try {
      const response = await fetch("/lesson/" + SECTION_ID + "/next-task/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({ passed_task_order: taskNumber - 1, code }),
      });
      const data = await response.json();
      if (data.complete) {
        taskNumber++;
        currentTask = null;
        updateStepsPanel();
        launchConfetti();
        floatXP("+30 XP BONUS!");
        document.getElementById("progressFill").style.width = "100%";
        document.getElementById("progressLabel").textContent = "100% Complete";
        document.getElementById("completeBtn").classList.remove("hidden");
        addEvaAIMessage(
          "The student has completed all application tasks successfully. Congratulate them warmly in 2 sentences.",
        );
        return;
      }
      taskNumber++;
      currentTask = data.task;
      failCount = 0;
      loadTaskUI(currentTask);
      updateStepsPanel();
      addEvaAIMessage(
        "The student just passed a task. Congratulate them in 1 sentence and encourage the next challenge. No code.",
      );
    } catch (err) {
      console.error("Error loading next task:", err);
    }
  }

  // ── FREE CODE: Run button ──
  document.getElementById("runBtn").addEventListener("click", async () => {
    if (!currentTask || currentTask.task_type !== "free_code") return;
    const runBtn = document.getElementById("runBtn");
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;
    const code = editor.getValue();
    const result = await runCode(code);
    showOutput("outputBody", "outputStatus", result.output, result.error);
    runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
    runBtn.disabled = false;
    if (result.error) {
      failCount++;
      addEvaAIMessage(
        `The student got this error: "${result.error}". Guide them in 1 sentence. No code.`,
      );
      updateStepsPanel();
      return;
    }
    const passed = await validateCode(code, result.output);
    if (passed) {
      failCount = 0;
      await onTaskPassed(code);
    } else {
      failCount++;
      updateStepsPanel();
    }
  });

  // ── FREE CODE: Reset button ──
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (currentTask)
      editor.setValue(currentTask.starter_code || "# Write your code here\n\n");
    document.getElementById("outputBody").innerHTML =
      '<span class="app-output-placeholder">Run your code to see output...</span>';
    document.getElementById("outputStatus").textContent = "";
    addEvaAIMessage(
      "The student reset their code. Encourage them in 1 sentence.",
    );
  });

  // ── FILL BLANK: Submit button ──
  document
    .getElementById("fillSubmitBtn")
    .addEventListener("click", async () => {
      if (!currentTask || currentTask.task_type !== "fill_blank") return;
      const input = document.getElementById("fillBlankInput");
      const feedback = document.getElementById("fillFeedback");
      const answer = input.value.trim();
      if (!answer) return;
      const correct = (currentTask.correct_answer || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      const studentAnswer = answer.trim().toLowerCase().replace(/\s+/g, "");
      if (studentAnswer === correct) {
        feedback.textContent = "Correct!";
        feedback.className = "fill-feedback success";
        floatXP("+5 XP");
        failCount = 0;
        await onTaskPassed(answer);
      } else {
        failCount++;
        feedback.textContent = "Not quite — try again!";
        feedback.className = "fill-feedback error";
        if (failCount >= 2) {
          document.getElementById("fillBlankHint").textContent =
            "💡 " + currentTask.hint;
        }
        updateStepsPanel();
        addEvaAIMessage(
          `Student answered "${answer}" for a fill-in-the-blank about: ${currentTask.instruction}. Guide them with a question. No answer, no code.`,
        );
      }
    });

  // Allow Enter key on fill blank
  document.getElementById("fillBlankInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("fillSubmitBtn").click();
  });

  // ── BUG FIX: Run button ──
  document.getElementById("bugRunBtn").addEventListener("click", async () => {
    if (!currentTask || currentTask.task_type !== "bug_fix") return;
    const btn = document.getElementById("bugRunBtn");
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    btn.disabled = true;
    const code = bugEditor.getValue();
    const result = await runCode(code);
    showOutput("bugOutputBody", "bugOutputStatus", result.output, result.error);
    btn.innerHTML = '<i class="fas fa-play"></i> Run Fixed Code';
    btn.disabled = false;
    if (result.error) {
      failCount++;
      addEvaAIMessage(
        `The student got this error: "${result.error}". Guide them in 1 sentence. No code.`,
      );
      updateStepsPanel();
      return;
    }
    const passed = await validateCode(code, result.output);
    if (passed) {
      failCount = 0;
      await onTaskPassed(code);
    } else {
      failCount++;
      updateStepsPanel();
    }
  });

  // ── BUG FIX: Reset button ──
  document.getElementById("bugResetBtn").addEventListener("click", () => {
    if (currentTask)
      bugEditor.setValue(
        currentTask.code_template || currentTask.starter_code || "",
      );
    document.getElementById("bugOutputBody").innerHTML =
      '<span class="app-output-placeholder">Run your fixed code to test it...</span>';
    document.getElementById("bugOutputStatus").textContent = "";
  });

  // ── Initialize ──
  if (ALREADY_COMPLETED) {
    updateStepsPanel();
    document.getElementById("progressFill").style.width = "100%";
    document.getElementById("progressLabel").textContent = "100% Complete";
    document.getElementById("completeBtn").classList.remove("hidden");
    addEvaAIMessage(
      "Greet the student warmly in 1 sentence. Tell them that they finished the tasks successfully.",
    );
  } else if (currentTask) {
    loadTaskUI(currentTask);
    updateStepsPanel();
    addEvaAIMessage(
      "Greet the student warmly in 1 sentence. Tell them EVA is here if they get stuck. No code, no task details.",
    );
  }
});
