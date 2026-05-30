"use strict";

/* ============================================================
   NAVBAR — scroll shadow + hamburger
============================================================ */
const navbar = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const mobileOverlay = document.getElementById("mobileOverlay");

if (navbar) {
  window.addEventListener(
    "scroll",
    () => {
      navbar.classList.toggle("scrolled", window.scrollY > 10);
      updateAOS();
      updateJourneySteps();
    },
    { passive: true },
  );
}

function toggleMobileMenu(force) {
  const isOpen =
    force !== undefined ? force : !navLinks.classList.contains("open");
  hamburger?.classList.toggle("open", isOpen);
  navLinks?.classList.toggle("open", isOpen);
  mobileOverlay?.classList.toggle("show", isOpen);
  document.body.style.overflow = isOpen ? "hidden" : "";
}

hamburger?.addEventListener("click", () => toggleMobileMenu());
mobileOverlay?.addEventListener("click", () => toggleMobileMenu(false));
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => toggleMobileMenu(false));
});

/* ============================================================
   AOS — scroll animations
============================================================ */
const aosEls = document.querySelectorAll("[data-aos]");

function updateAOS() {
  aosEls.forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight - 60) {
      el.classList.add("aos-animate");
    }
  });
}
window.addEventListener("load", updateAOS);
setTimeout(updateAOS, 120);

/* ============================================================
   COUNTER ANIMATION
============================================================ */
let countersStarted = false;
const counterEls = document.querySelectorAll(".stat-number");

function startCounters() {
  if (countersStarted) return;
  countersStarted = true;
  counterEls.forEach((el) => {
    const target = +el.dataset.target;
    const steps = 60;
    let current = 0;
    const inc = target / steps;
    const timer = setInterval(() => {
      current = Math.min(current + inc, target);
      el.textContent = Math.floor(current);
      if (current >= target) clearInterval(timer);
    }, 1800 / steps);
  });
}

const statsSection = document.querySelector(".hero-stats");
if (statsSection) {
  new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        startCounters();
      }
    },
    { threshold: 0.5 },
  ).observe(statsSection);
}

/* ============================================================
   HERO CARD TILT
============================================================ */
const codeCard = document.querySelector(".code-card");
if (codeCard) {
  codeCard.addEventListener("mousemove", (e) => {
    const r = codeCard.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    codeCard.style.transform = `perspective(800px) rotateX(${((-y / r.height) * 8).toFixed(2)}deg) rotateY(${((x / r.width) * 8).toFixed(2)}deg) translateY(-6px)`;
  });
  codeCard.addEventListener("mouseleave", () => {
    codeCard.style.transform = "";
  });
}

/* ============================================================
   JOURNEY STEPS — scroll highlight
============================================================ */
const journeyItems = document.querySelectorAll(".ch-journey-item");

function updateJourneySteps() {
  if (!journeyItems.length) return;
  const focusY = window.innerHeight * 0.42;
  let closestIdx = 0,
    closestDist = Infinity;
  journeyItems.forEach((item, i) => {
    const circle = item.querySelector(".ch-step-circle");
    if (!circle) return;
    const rect = circle.getBoundingClientRect();
    const dist = Math.abs(rect.top + rect.height / 2 - focusY);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });
  journeyItems.forEach((item, i) => {
    const circle = item.querySelector(".ch-step-circle");
    const active = i === closestIdx;
    item.classList.toggle("is-active", active);
    circle?.classList.toggle("is-active", active);
  });
}
window.addEventListener("load", updateJourneySteps);
setTimeout(updateJourneySteps, 200);

/* ============================================================
   PASSWORD TOGGLE
============================================================ */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-pw");
  if (!btn) return;
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  btn.querySelector("i").className = isPass ? "fas fa-eye-slash" : "fas fa-eye";
});

/* ============================================================
   SMOOTH SCROLL
============================================================ */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (href === "#") return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

/* ============================================================
   PARTICLE EFFECT
============================================================ */
function createParticle(x, y) {
  const p = document.createElement("div");
  p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:8px;height:8px;background:var(--purple);border-radius:50%;pointer-events:none;z-index:9999;animation:particleFly 0.8s ease forwards;`;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 800);
}
const particleStyle = document.createElement("style");
particleStyle.textContent = `@keyframes particleFly{0%{transform:scale(1) translate(0,0);opacity:1}100%{transform:scale(0) translate(0,-100px);opacity:0}}`;
document.head.appendChild(particleStyle);

document
  .querySelectorAll(".btn-primary, .btn-cta-white, .btn-ghost, .ch-cta-btn")
  .forEach((btn) => {
    btn.addEventListener("click", (e) => {
      for (let i = 0; i < 6; i++) {
        setTimeout(
          () =>
            createParticle(
              e.clientX + (Math.random() - 0.5) * 30,
              e.clientY + (Math.random() - 0.5) * 30,
            ),
          i * 50,
        );
      }
    });
  });

/* ============================================================
   CTA / GAME CARD LINKS → go to register
============================================================ */
document
  .querySelectorAll('.ch-start-link[data-action="trial"]')
  .forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/register/";
    });
  });

document.getElementById("ctaStartLearning")?.addEventListener("click", () => {
  window.location.href = "/register/";
});

document.getElementById("openTrialHero")?.addEventListener("click", () => {
  window.location.href = "/register/";
});

document.getElementById("openTrialCta")?.addEventListener("click", () => {
  window.location.href = "/register/";
});
