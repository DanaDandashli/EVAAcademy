"use strict";

/* ============================================================
   REGISTER PAGE — UI only
   - Shows/hides step 2 fields based on selected age group
   - Handles PIN inputs for child registration
   - No server calls — form submits normally via POST
============================================================ */

const stepAdult = document.getElementById("stepAdult");
const stepChild = document.getElementById("stepChild");
const submitBtn = document.getElementById("submitBtn");
const pathOptions = document.querySelectorAll(
  '.path-option input[type="radio"]',
);

function updateStep(ageGroup) {
  if (!ageGroup) {
    stepAdult.style.display = "none";
    stepChild.style.display = "none";
    return;
  }
  if (ageGroup === "child") {
    stepAdult.style.display = "none";
    stepChild.style.display = "block";
    submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Let\'s Go!';
    submitBtn.className = "btn-auth-primary btn-child-start";
  } else {
    stepAdult.style.display = "block";
    stepChild.style.display = "none";
    submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Account';
    submitBtn.className = "btn-auth-primary";
  }
}

// Init — show correct step on page load (e.g. after validation error)
const checkedPath = document.querySelector(
  '.path-option input[type="radio"]:checked',
);
updateStep(checkedPath?.value || null);

// Update on change
pathOptions.forEach((radio) => {
  radio.addEventListener("change", () => {
    document
      .querySelectorAll(".path-option")
      .forEach((o) => o.classList.remove("selected"));
    radio.closest(".path-option").classList.add("selected");
    updateStep(radio.value);
  });
});

/* ── PIN inputs ── */
const pinInputs = document.querySelectorAll(".child-pin-input");
const pinHidden = document.getElementById("pinHidden");

pinInputs.forEach((input, idx) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
    if (input.value && idx < pinInputs.length - 1) pinInputs[idx + 1].focus();
    updatePinHidden();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && idx > 0)
      pinInputs[idx - 1].focus();
  });
});

function updatePinHidden() {
  if (pinHidden) {
    pinHidden.value = Array.from(pinInputs)
      .map((i) => i.value)
      .join("");
  }
}

/* ── Avatar picker ── */
document.querySelectorAll(".child-avatar-card").forEach((card) => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll(".child-avatar-card")
      .forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
  });
  // Also highlight when radio changes
  const radio = card.querySelector('input[type="radio"]');
  radio?.addEventListener("change", () => {
    document
      .querySelectorAll(".child-avatar-card")
      .forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
  });
});
