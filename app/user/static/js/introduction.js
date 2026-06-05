"use strict";

document.addEventListener("DOMContentLoaded", () => {
  let current = 1;
  const total = TOTAL_SLIDES;

  const btnBack = document.getElementById("btnBack");
  const btnNext = document.getElementById("btnNext");
  const btnComplete = document.getElementById("btnComplete");
  const progressFill = document.getElementById("progressFill");
  const currentNum = document.getElementById("currentSlideNum");

  // ── Run slide code in read-only output ──
  function runSlideCode(code) {
    const outputBody = document.getElementById("introOutputBody");
    if (!outputBody || !code || !code.trim()) {
      if (outputBody)
        outputBody.innerHTML =
          '<span style="color:#4b5563;font-size:0.82rem;">No output for this slide.</span>';
      return;
    }

    outputBody.innerHTML = "";

    function outf(text) {
      const el = document.createElement("div");
      el.className = "adv-out-line cmd";
      el.textContent = text;
      outputBody.appendChild(el);
    }

    function builtinRead(x) {
      if (
        Sk.builtinFiles === undefined ||
        Sk.builtinFiles["files"][x] === undefined
      )
        throw "File not found: " + x;
      return Sk.builtinFiles["files"][x];
    }

    Sk.configure({
      output: outf,
      read: builtinRead,
      inputfun: function (prompt) {
        return new Promise((resolve) => {
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
        });
      },
      inputfunTakesPrompt: true,
    });

    Sk.misceval
      .asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, code, true))
      .catch((err) => {
        const el = document.createElement("div");
        el.className = "adv-out-line err";
        el.textContent = err.toString();
        outputBody.appendChild(el);
      });
  }

  function goToSlide(n) {
    // Hide all slides and code blocks
    document
      .querySelectorAll(".intro-slide")
      .forEach((el) => el.classList.remove("active"));
    document
      .querySelectorAll(".intro-code-block")
      .forEach((el) => el.classList.remove("active"));

    // Show current
    const slide = document.querySelector(`.intro-slide[data-slide="${n}"]`);
    const codeBlock = document.querySelector(
      `.intro-code-block[data-slide="${n}"]`,
    );
    if (slide) slide.classList.add("active");
    if (codeBlock) codeBlock.classList.add("active");

    // Update counter
    currentNum.textContent = n;

    // Update progress bar
    const pct = (n / total) * 100;
    progressFill.style.width = pct + "%";

    // Update buttons
    btnBack.disabled = n === 1;

    if (n === total) {
      btnNext.style.display = "none";
      btnComplete.style.display = "flex";
    } else {
      btnNext.style.display = "flex";
      btnComplete.style.display = "none";
    }

    // ── Run code for current slide ──
    const slideData = SLIDES_DATA.find((s) => s.order === n);
    const code = slideData ? slideData.code : "";
    runSlideCode(code);
  }

  btnNext.addEventListener("click", () => {
    if (current < total) {
      current++;
      goToSlide(current);
    }
  });

  btnBack.addEventListener("click", () => {
    if (current > 1) {
      current--;
      goToSlide(current);
    }
  });

  // Initialize
  goToSlide(1);
});
