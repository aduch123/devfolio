// ---- Footer year ----
const yearSpan = document.getElementById("year");
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// ---- Respect reduced motion ----
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// ---- Mobile menu ----
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");

if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", function () {
    const isOpen = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", isOpen);
  });

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}

// ---- Active nav link on scroll ----
const sections = document.querySelectorAll("main section[id]");
const navAnchors = document.querySelectorAll(".nav-links a");

if (sections.length && navAnchors.length) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navAnchors.forEach((a) => {
            const isActive = a.getAttribute("data-tab") === id;
            a.classList.toggle("active", isActive);
            if (isActive) {
              a.setAttribute("aria-current", "true");
            } else {
              a.removeAttribute("aria-current");
            }
          });
        }
      });
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );

  sections.forEach((section) => navObserver.observe(section));
}

// ---- Scroll reveal ----
function setupScrollReveal(container = document) {
  const revealTargets = container.querySelectorAll(
    ".about, .skills, .projects, .contact, .skill-card, .project-card"
  );

  revealTargets.forEach((el) => el.classList.add("reveal"));

  if (prefersReducedMotion) {
    revealTargets.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}

setupScrollReveal();
window.setupScrollReveal = setupScrollReveal; // exposed so portfolio.js can re-run after injecting cards
