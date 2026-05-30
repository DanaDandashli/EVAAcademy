"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ── Timer ──
  let totalSeconds = 600; // 10 minutes
  const timerEl = document.getElementById("timerVal");
  const timerWrap = document.getElementById("testTimer");

  const timerInterval = setInterval(() => {
    totalSeconds--;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;

    if (totalSeconds <= 60) timerWrap.classList.add("urgent");
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = "0:00";
      document.getElementById("testCompleteBtn").classList.remove("hidden");
    }
  }, 1000);

  // ── Init CodeMirror ──
  const editor = CodeMirror.fromTextArea(
    document.getElementById("testEditor"),
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

  editor.setValue("# Write your solution here — no hints!\n\n");
  setTimeout(() => editor.refresh(), 100);

  // ── Run button ──
  document.getElementById("testRunBtn").addEventListener("click", () => {
    const code = editor.getValue();
    const output = document.getElementById("testOutputBody");
    const status = document.getElementById("testOutputStatus");
    const runBtn = document.getElementById("testRunBtn");

    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled = true;

    setTimeout(() => {
      runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
      runBtn.disabled = false;

      let totalEarned = 0;
      const results = QUESTIONS.map((q) => {
        const passed = new RegExp(q.check_regex).test(code);
        if (passed) totalEarned += q.points;
        return { instruction: q.instruction, passed, points: q.points };
      });

      // Show results
      output.innerHTML = results
        .map(
          (r) =>
            `<span class="adv-out-line ${r.passed ? "cmd" : "err"}">
          ${r.passed ? "✓" : "✗"} ${r.instruction} — ${r.passed ? "+" + r.points + " pts" : "0 pts"}
        </span>`,
        )
        .join("");

      // Update score
      const pct = (totalEarned / TOTAL_POINTS) * 100;
      document.getElementById("testScoreBar").style.width = pct + "%";
      document.getElementById("testsPassed").textContent =
        `${totalEarned} / ${TOTAL_POINTS}`;

      if (totalEarned === TOTAL_POINTS) {
        status.textContent = "● All tests passed!";
        status.className = "app-output-status success";
        clearInterval(timerInterval);
        document.getElementById("testCompleteBtn").classList.remove("hidden");
        launchConfetti();
      } else {
        status.textContent = `● ${totalEarned}/${TOTAL_POINTS} points`;
        status.className = "app-output-status error";
      }
    }, 700);
  });

  // ── Confetti ──
  function launchConfetti() {
    const canvas = document.getElementById("appConfetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#7c3aed", "#a855f7", "#ef4444", "#f59e0b", "#10b981"];
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
