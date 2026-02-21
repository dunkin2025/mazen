/* =========================
   MA-ZEN Global Script
========================= */

document.addEventListener("DOMContentLoaded", () => {

  // Footer Year
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Active Nav Highlight
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".navlink");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");

    if (href === currentPage) {
      link.classList.add("active");
    }
  });

});
