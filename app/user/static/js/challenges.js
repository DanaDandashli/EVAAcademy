"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── Phases ──
  const phaseGenerate = document.getElementById("chPhaseGenerate");
  const phaseSandbox = document.getElementById("chPhaseSandbox");

  function showPhase(name) {
    phaseGenerate.classList.add("hidden");
    phaseSandbox.classList.add("hidden");
    if (name === "generate") phaseGenerate.classList.remove("hidden");
    if (name === "sandbox") phaseSandbox.classList.remove("hidden");
  }

  // ── State ──
  let projectId = PROJECT_ID;
  let editor = null;
  let autoSaveTimer = null;

  // ── CodeMirror ──
  const textarea = document.getElementById("chCodeEditor");
  if (textarea) {
    editor = CodeMirror.fromTextArea(textarea, {
      mode: "python",
      theme: "dracula",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: true,
    });
    editor.refresh();

    // ── Auto-save on change (debounced 2s) ──
    editor.on("change", () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => saveCode(), 2000);
    });
  }

  // ── EVA chat elements ──
  const chatMessages = document.getElementById("chChatMessages");
  const chatInput = document.getElementById("chChatInput");
  const chatSend = document.getElementById("chChatSend");
  const evaTyping = document.getElementById("chEvaTyping");

  // ── Helpers ──
  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseMarkdown(text) {
    return text
      .replace(
        /```python([\s\S]*?)```/g,
        '<pre style="background:#0d0d0d;color:#fff;border-radius:8px;padding:10px;font-family:monospace;font-size:0.8rem;white-space:pre-wrap;margin:6px 0;">$1</pre>',
      )
      .replace(
        /```([\s\S]*?)```/g,
        '<pre style="background:#0d0d0d;color:#fff;border-radius:8px;padding:10px;font-family:monospace;font-size:0.8rem;white-space:pre-wrap;margin:6px 0;">$1</pre>',
      )
      .replace(
        /`([^`]+)`/g,
        '<code style="background:rgba(108,99,255,0.15);color:var(--accent,#6c63ff);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.82rem;">$1</code>',
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function appendUserMsg(text) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    div.className = "ch-msg user";
    div.innerHTML =
      '<div class="ch-msg-bubble user-bubble"><p>' +
      escHtml(text) +
      "</p></div>" +
      '<span class="ch-msg-meta">Me</span>';
    chatMessages.insertBefore(div, evaTyping);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendEvaMsg(text) {
    if (!chatMessages || !evaTyping) return;
    evaTyping.style.display = "none";
    const div = document.createElement("div");
    div.className = "ch-msg eva";
    div.innerHTML =
      '<div class="ch-eva-avatar-sm"><img src="/static/images/eva-robot-avatar.jpeg" alt="EVA"/></div>' +
      '<div class="ch-msg-bubble"><p>' +
      parseMarkdown(text) +
      "</p></div>";
    chatMessages.insertBefore(div, evaTyping);
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
  }

  function showEvaTyping() {
    if (evaTyping) {
      evaTyping.style.display = "flex";
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function hideEvaTyping() {
    if (evaTyping) evaTyping.style.display = "none";
  }

  function updateStatusPill(status) {
    const pill = document.getElementById("chStatusPill");
    if (!pill) return;
    const icons = {
      draft: "fas fa-circle-dot",
      submitted: "fas fa-clock",
      reviewed: "fas fa-magnifying-glass-chart",
      published: "fas fa-circle-check",
    };
    pill.innerHTML = `<i class="${icons[status] || "fas fa-circle-dot"}"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  }

  // ── Save code ──
  async function saveCode() {
    if (!projectId || !editor) return;
    try {
      await fetch("/challenges/save/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          project_id: projectId,
          code: editor.getValue(),
        }),
      });
    } catch {
      /* silent fail */
    }
  }

  // ── Generate new project ──
  const generateBtn = document.getElementById("chGenerateBtn");
  generateBtn?.addEventListener("click", async () => {
    generateBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> EVA is thinking...';
    generateBtn.disabled = true;

    try {
      const res = await fetch("/challenges/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          completed_topics: COMPLETED_TOPICS,
          completed_lessons: COMPLETED_LESSONS,
        }),
      });
      const data = await res.json();

      if (data.success) {
        projectId = data.project_id;
        document.getElementById("chProjectTitle").textContent = data.title;
        document.getElementById("chProjectDesc").textContent = data.description;
        editor?.setValue("");
        showPhase("sandbox");

        // EVA greeting for the new project
        showEvaTyping();
        const greetRes = await fetch("/advisor/chat/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": CSRF_TOKEN,
          },
          body: JSON.stringify({
            message: `I just started a new project: "${data.title}". ${data.description} Help me get started without writing any code.`,
            code: "",
            lesson: "Project",
            eva_context: { completedLessons: COMPLETED_LESSONS },
            mode: "chat",
          }),
        });
        const greetData = await greetRes.json();
        hideEvaTyping();
        appendEvaMsg(
          greetData.reply ||
            "Great! Let's build this together. What will you start with?",
        );
      }
    } catch {
      generateBtn.innerHTML =
        '<i class="fas fa-sparkles"></i> Generate My Project';
      generateBtn.disabled = false;
    }
  });

  // ── Regenerate project ──
  const regenerateBtn = document.getElementById("chRegenerateBtn");
  regenerateBtn?.addEventListener("click", async () => {
    if (
      !confirm(
        "This will discard your current project and generate a new one. Are you sure?",
      )
    )
      return;

    regenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    regenerateBtn.disabled = true;

    try {
      const res = await fetch("/challenges/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          completed_topics: COMPLETED_TOPICS,
          completed_lessons: COMPLETED_LESSONS,
        }),
      });
      const data = await res.json();

      if (data.success) {
        projectId = data.project_id;
        document.getElementById("chProjectTitle").textContent = data.title;
        document.getElementById("chProjectDesc").textContent = data.description;
        editor?.setValue("");
        updateStatusPill("draft");

        // Clear chat
        chatMessages
          ?.querySelectorAll(".ch-msg:not(.typing-indicator)")
          .forEach((el) => el.remove());

        showEvaTyping();
        const greetRes = await fetch("/advisor/chat/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": CSRF_TOKEN,
          },
          body: JSON.stringify({
            message: `I just started a new project: "${data.title}". ${data.description} Help me get started without writing any code.`,
            code: "",
            lesson: "Project",
            eva_context: { completedLessons: COMPLETED_LESSONS },
            mode: "chat",
          }),
        });
        const greetData = await greetRes.json();
        hideEvaTyping();
        appendEvaMsg(
          greetData.reply || "New project loaded! Let's build it together.",
        );
      }
    } catch {
      /* silent */
    }

    regenerateBtn.innerHTML = '<i class="fas fa-rotate"></i> New Project';
    regenerateBtn.disabled = false;
  });

  // ── Run button ──
  const runBtn = document.getElementById("chRunBtn");
  const outputBody = document.getElementById("chOutputBody");
  const outputStatus = document.getElementById("chOutputStatus");

  runBtn?.addEventListener("click", async () => {
    const code = editor?.getValue() || "";
    if (!code.trim()) return;

    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;
    outputBody.innerHTML = "";

    const cmdEl = document.createElement("div");
    cmdEl.style.cssText =
      "font-family:monospace;font-size:0.78rem;color:#a5f3fc;line-height:1.7;";
    cmdEl.textContent = "$ python project.py";
    outputBody.appendChild(cmdEl);

    let outputText = "";

    Sk.configure({
      output: (text) => {
        outputText += text;
        const el = document.createElement("div");
        el.style.cssText =
          "font-family:monospace;font-size:0.78rem;color:#e2e8f0;line-height:1.7;";
        el.textContent = text;
        outputBody.appendChild(el);
        outputBody.scrollTop = outputBody.scrollHeight;
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
      outputStatus.textContent = "done";
      outputStatus.className = "ch-output-status success";
    } catch (e) {
      const errEl = document.createElement("div");
      errEl.style.cssText =
        "font-family:monospace;font-size:0.78rem;color:#f87171;line-height:1.7;";
      errEl.textContent = e.toString();
      outputBody.appendChild(errEl);
      outputStatus.textContent = "error";
      outputStatus.className = "ch-output-status error";
    }

    // Auto-save after run
    await saveCode();

    // EVA feedback on run
    showEvaTyping();
    try {
      const projectTitle =
        document.getElementById("chProjectTitle")?.textContent ||
        "Python Project";
      const projectDesc =
        document.getElementById("chProjectDesc")?.textContent || "";
      const evaRes = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: `Project: "${projectTitle}". Goal: ${projectDesc}. My code so far:\n${code}\nOutput: ${outputText || "(no output)"}. Am I on the right track? Guide me without writing code.`,
          code: code,
          lesson: "Project",
          eva_context: { completedLessons: COMPLETED_LESSONS },
          mode: "chat",
        }),
      });
      const evaData = await evaRes.json();
      hideEvaTyping();
      appendEvaMsg(evaData.reply || "Keep going! You're making progress.");
    } catch {
      hideEvaTyping();
    }

    runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
    runBtn.disabled = false;
  });

  // ── EVA chat ──
  async function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text) return;
    appendUserMsg(text);
    chatInput.value = "";
    showEvaTyping();

    try {
      const res = await fetch("/advisor/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({
          message: text,
          code: editor?.getValue() || "",
          lesson: "Project",
          eva_context: { completedLessons: COMPLETED_LESSONS },
          mode: "chat",
        }),
      });
      const data = await res.json();
      hideEvaTyping();
      appendEvaMsg(data.reply || "Let me think about that...");
    } catch {
      hideEvaTyping();
      appendEvaMsg("I'm having trouble connecting. Try again in a moment!");
    }
  }

  chatSend?.addEventListener("click", sendMessage);
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ── Request EVA Review ──
  const reviewBtn = document.getElementById("chReviewBtn");
  reviewBtn?.addEventListener("click", async () => {
    const code = editor?.getValue() || "";
    if (!code.trim()) {
      appendEvaMsg(
        "Your project is empty! Write some code before requesting a review.",
      );
      return;
    }

    reviewBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> EVA is reviewing...';
    reviewBtn.disabled = true;
    updateStatusPill("submitted");

    try {
      const res = await fetch("/challenges/review/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({ project_id: projectId, code }),
      });
      const data = await res.json();

      if (data.success) {
        updateStatusPill("reviewed");
        appendEvaMsg(data.feedback);

        // Show publish button if approved
        if (data.feedback.includes("APPROVED")) {
          const publishBtn = document.createElement("button");
          publishBtn.className = "ch-publish-btn";
          publishBtn.innerHTML =
            '<i class="fas fa-rocket"></i> Publish to Portfolio';
          publishBtn.addEventListener("click", () =>
            publishProject(publishBtn),
          );
          document.getElementById("chChatActions")?.appendChild(publishBtn);
        }
      }
    } catch {
      appendEvaMsg("Could not get a review right now. Try again in a moment.");
    }

    reviewBtn.innerHTML =
      '<i class="fas fa-magnifying-glass-chart"></i> Request EVA Review';
    reviewBtn.disabled = false;
  });

  // ── Publish project ──
  async function publishProject(btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
    btn.disabled = true;

    try {
      const res = await fetch("/challenges/publish/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": CSRF_TOKEN,
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      const data = await res.json();

      if (data.success) {
        updateStatusPill("published");
        btn.innerHTML = '<i class="fas fa-circle-check"></i> Published!';
        appendEvaMsg(
          "Congratulations! Your project is now published to your portfolio. You earned +100 XP! Ready for your next project?",
        );

        setTimeout(() => {
          window.location.href = DASHBOARD_URL;
        }, 3000);
      } else {
        btn.innerHTML = '<i class="fas fa-rocket"></i> Publish to Portfolio';
        btn.disabled = false;
      }
    } catch {
      btn.innerHTML = '<i class="fas fa-rocket"></i> Publish to Portfolio';
      btn.disabled = false;
    }
  }

  // ── Init: if active project exists, start EVA greeting ──
  if (projectId) {
    showPhase("sandbox");
    const projectTitle =
      document.getElementById("chProjectTitle")?.textContent || "";
    const projectDesc =
      document.getElementById("chProjectDesc")?.textContent || "";
    showEvaTyping();
    fetch("/advisor/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
      },
      body: JSON.stringify({
        message: `Welcome back! I'm working on my project: "${projectTitle}". ${projectDesc}. Here's my code so far:\n${editor?.getValue() || "(empty)"}. Give me a brief status check and next step without writing any code.`,
        code: editor?.getValue() || "",
        lesson: "Project",
        eva_context: { completedLessons: COMPLETED_LESSONS },
        mode: "chat",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        hideEvaTyping();
        appendEvaMsg(
          data.reply || "Welcome back! Let's continue where you left off.",
        );
      })
      .catch(() => hideEvaTyping());
  }
});

function openPortfolioModal(title, desc, code, feedback) {
  document.getElementById("chModalTitle").textContent = title;
  document.getElementById("chModalDesc").textContent = desc;
  document.getElementById("chModalCode").textContent =
    code || "(no code saved)";
  document.getElementById("chModalFeedback").innerHTML =
    feedback
      .replace(
        /```python([\s\S]*?)```/g,
        '<pre style="background:#0d1117;color:#e2e8f0;border-radius:8px;padding:10px;font-family:monospace;font-size:0.8rem;white-space:pre-wrap;margin:6px 0;">$1</pre>',
      )
      .replace(/\n/g, "<br>") || "(no feedback yet)";
  document.getElementById("chPortfolioModal").style.display = "flex";
}
