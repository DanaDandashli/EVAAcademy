"use strict";

document.addEventListener("DOMContentLoaded", () => {
  let current = 1;
  const total = TOTAL_SLIDES;

  const btnBack = document.getElementById("btnBack");
  const btnNext = document.getElementById("btnNext");
  const btnComplete = document.getElementById("btnComplete");
  const progressFill = document.getElementById("progressFill");
  const currentNum = document.getElementById("currentSlideNum");

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
    const code = document.querySelector(`.intro-code-block[data-slide="${n}"]`);
    if (slide) slide.classList.add("active");
    if (code) code.classList.add("active");

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
