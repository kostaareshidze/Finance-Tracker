// app.js — core app state and navigation

let currentUser = null;
let categories = [];
let currentPage = "dashboard";

const CURRENCIES = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "AU$",
  GEL: "₾",
};

function fmt(amount) {
  const sym = CURRENCIES[currentUser?.currency] || "$";
  return (
    sym +
    Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

async function initApp(user) {
  currentUser = user;
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("user-name").textContent = user.username;
  document.getElementById("user-avatar").textContent =
    user.username[0].toUpperCase();
  document.getElementById("user-currency").textContent = user.currency || "USD";

  categories = (await apiGet("/categories")) || [];
  navigate("dashboard");
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.toggle("active", l.dataset.page === page);
  });
  document.getElementById("page-" + page)?.classList.remove("hidden");

  const titles = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    budgets: "Budgets",
    yearly: "Yearly Stats",
    categories: "Categories",
  };
  document.getElementById("page-title").textContent = titles[page] || page;

  // close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");

  if (page === "dashboard") loadDashboard();
  if (page === "transactions") loadTransactions();
  if (page === "budgets") loadBudgets();
  if (page === "yearly") loadYearly();
  if (page === "categories") loadCategories();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === "dark" ? "light" : "dark";
  html.dataset.theme = next;
  localStorage.setItem("ft_theme", next);
}

function openModal(title, bodyHtml) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}

function showToast(msg, duration = 2500) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.add("hidden"), duration);
}

function catBg(color) {
  return color ? color + "22" : "#6366f122";
}

function txIcon(tx) {
  return tx.category_icon || (tx.type === "income" ? "💰" : "📤");
}

// Restore theme on load
(function () {
  const saved = localStorage.getItem("ft_theme") || "dark";
  document.documentElement.dataset.theme = saved;
})();

window.addEventListener("DOMContentLoaded", checkAuth);
