'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── State ──
  let currentQuestion  = QUESTIONS[0] || null;
  let questionNumber   = 1;
  let failCount        = 0;
  let passCount        = 0;
  const SECTION_ID     = parseInt(document.getElementById('sectionId')?.value || 0);
  const CSRF_TOKEN     = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

  // ── Init CodeMirror ──
  const editor = CodeMirror.fromTextArea(document.getElementById('testEditor'), {
    mode:           'python',
    theme:          'dracula',
    lineNumbers:    true,
    indentUnit:     4,
    tabSize:        4,
    indentWithTabs: false,
    lineWrapping:   true,
    autofocus:      true,
  });

  if (currentQuestion) {
    editor.setValue(currentQuestion.starter_code || '# Write your solution here\n\n');
  }
  setTimeout(() => editor.refresh(), 100);

  // ── Skulpt execution ──
  function runCode(code) {
    return new Promise((resolve) => {
      let output = '';
      function outf(text) { output += text; }
      function builtinRead(x) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles['files'][x] === undefined)
          throw 'File not found: ' + x;
        return Sk.builtinFiles['files'][x];
      }
      Sk.configure({ output: outf, read: builtinRead });
      Sk.misceval.asyncToPromise(() =>
        Sk.importMainWithBody('<stdin>', false, code, true)
      ).then(() => resolve({ output, error: null }))
       .catch((err) => resolve({ output, error: err.toString() }));
    });
  }

  // ── Display output ──
  function showOutput(output, error) {
    const body   = document.getElementById('testOutputBody');
    const status = document.getElementById('testOutputStatus');
    body.innerHTML = '';

    const cmdEl = document.createElement('div');
    cmdEl.className   = 'adv-out-line cmd';
    cmdEl.textContent = '$ python solution.py';
    body.appendChild(cmdEl);

    if (output) {
      output.split('\n').forEach(line => {
        if (!line) return;
        const el = document.createElement('div');
        el.className   = 'adv-out-line cmd';
        el.textContent = line;
        body.appendChild(el);
      });
    }

    if (error) {
      error.split('\n').forEach(line => {
        if (!line) return;
        const el = document.createElement('div');
        el.className   = 'adv-out-line err';
        el.textContent = line;
        body.appendChild(el);
      });
      status.textContent = 'error';
      status.className   = 'app-output-status error';
    } else {
      status.textContent = 'done';
      status.className   = 'app-output-status success';
    }
  }

  // ── Update question panel ──
  function updateQuestionPanel() {
    const taskCard = document.getElementById('testTaskCard');
    if (!taskCard || !currentQuestion) return;

    taskCard.innerHTML = `
      <h2>Question ${questionNumber}</h2>
      <p>${currentQuestion.instruction}</p>
      ${failCount >= 3 ? '<p style="color:#ef4444;font-size:0.82rem;margin-top:8px;"><i class="fas fa-exclamation-circle"></i> Generating a simpler version...</p>' : ''}
    `;

    // Update score
    const scoreEl = document.getElementById('testsPassed');
    const scoreBar = document.getElementById('testScoreBar');
    const totalPossible = 100;
    const currentScore  = passCount * 20;
    const pct           = (currentScore / totalPossible) * 100;

    if (scoreEl)  scoreEl.textContent  = currentScore + ' / 100';
    if (scoreBar) scoreBar.style.width = pct + '%';
  }

  // ── Validate with EVA (silent) ──
  async function validateWithEva(instruction, code, output) {
    try {
      const response = await fetch('/advisor/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': CSRF_TOKEN,
        },
        body: JSON.stringify({
          message:     instruction,
          code:        code,
          output:      output,
          mode:        'validate',
          eva_context: {},
          is_greeting: false,
        }),
      });

      const data   = await response.json();
      const reply  = data.reply || '';
      const first  = reply.split('\n')[0]?.trim().toUpperCase();
      return { passed: first === 'PASS', feedback: reply.split('\n').slice(1).join(' ').trim() };

    } catch (err) {
      return { passed: false, feedback: 'Validation error. Try again.' };
    }
  }

  // ── Show feedback ──
  function showFeedback(message, type) {
    const el = document.getElementById('testFeedback');
    if (!el) return;
    el.textContent  = message;
    el.className    = 'test-feedback ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  // ── Confetti ──
  function launchConfetti() {
    const canvas = document.getElementById('appConfetti');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#008080','#00a0a0','#10b981','#f59e0b','#ec4899','#3b82f6'];
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
      particles.forEach(p => {
        if (p.y > canvas.height + 20 || p.opacity <= 0) return;
        alive = true;
        p.tilt += p.tiltSpeed;
        p.y    += p.d;
        p.x    += Math.sin(p.tilt) * 1.5;
        if (frame > 80) p.opacity -= 0.015;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle   = p.color;
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

  // ── Load next question ──
  async function loadNextQuestion() {
    const runBtn = document.getElementById('testRunBtn');
    if (runBtn) {
      runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      runBtn.disabled  = true;
    }

    try {
      const response = await fetch('/lesson/' + SECTION_ID + '/next-question/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': CSRF_TOKEN,
        },
        body: JSON.stringify({
          passed_question_order: questionNumber,
          code:                  editor.getValue(),
        }),
      });

      const data = await response.json();

      if (data.complete) {
        launchConfetti();
        document.getElementById('testsPassed').textContent = data.score + ' / ' + data.score;
        document.getElementById('testScoreBar').style.width = '100%';
        document.getElementById('testCompleteBtn').classList.remove('hidden');
        showFeedback('Excellent! You passed all questions! Click Submit to complete.', 'success');
        return;
      }

      currentQuestion = data.question;
      questionNumber++;
      failCount = 0;
      passCount++;

      editor.setValue(currentQuestion.starter_code || '# Write your solution here\n\n');
      updateQuestionPanel();
      showFeedback('Correct! Well done. Here is your next question.', 'success');

    } catch (err) {
      console.error('Error loading next question:', err);
      showFeedback('Error loading next question. Try again.', 'error');
    } finally {
      if (runBtn) {
        runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
        runBtn.disabled  = false;
      }
    }
  }

  // ── Run button ──
  document.getElementById('testRunBtn').addEventListener('click', async () => {
    if (!currentQuestion) return;

    const runBtn = document.getElementById('testRunBtn');
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    runBtn.disabled  = true;

    const code   = editor.getValue();
    const result = await runCode(code);

    showOutput(result.output, result.error);

    runBtn.innerHTML = '<i class="fas fa-play"></i> Run';
    runBtn.disabled  = false;

    if (result.error) {
      failCount++;
      showFeedback('There is an error in your code. Fix it and try again.', 'error');
      return;
    }

    // Validate silently
    const validation = await validateWithEva(
      currentQuestion.instruction,
      code,
      result.output
    );

    if (validation.passed) {
      await loadNextQuestion();
    } else {
      failCount++;
      if (failCount >= 3) {
        showFeedback('Keep trying! You are almost there.', 'warning');
      } else {
        showFeedback('Incorrect. Review what you learned and try again. No hints in the test!', 'error');
      }
    }
  });

  // ── Initialize ──
  updateQuestionPanel();
});