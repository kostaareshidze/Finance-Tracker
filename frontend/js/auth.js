// auth.js

let authMode = "login";

function switchAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll(".tab-btn").forEach((b, i) => {
    b.classList.toggle(
      "active",
      (i === 0 && mode === "login") || (i === 1 && mode === "register"),
    );
  });
  document
    .getElementById("register-extra")
    .classList.toggle("hidden", mode !== "register");
  document.getElementById("auth-submit-btn").textContent =
    mode === "login" ? "Sign In" : "Create Account";
  document.getElementById("auth-error").classList.add("hidden");
}

async function handleAuth(e) {
  e.preventDefault();

  const username = document.getElementById("auth-username").value.trim();
  const password = document.getElementById("auth-password").value;
  const errEl = document.getElementById("auth-error");

  errEl.classList.add("hidden");

  try {
    let data;

    if (authMode === "login") {
      data = await apiPost("/auth/login", { username, password });
    } else {
      const currency = document.getElementById("auth-currency").value;
      data = await apiPost("/auth/register", { username, password, currency });
    }

    console.log("AUTH RESPONSE:", data);

    // ❌ SAFETY CHECK (THIS FIXES YOUR NULL ISSUE)
    if (!data || !data.token) {
      throw new Error("No token received from server");
    }

    // ✅ SAVE TOKEN
    localStorage.setItem("ft_token", data.token);
    localStorage.setItem("ft_user", JSON.stringify(data.user));

    console.log("TOKEN SAVED:", localStorage.getItem("ft_token"));

    initApp(data.user);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

function logout() {
  localStorage.removeItem("ft_token");
  localStorage.removeItem("ft_user");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
}

function checkAuth() {
  const token = localStorage.getItem("ft_token");
  const user = JSON.parse(localStorage.getItem("ft_user") || "null");
  if (token && user) {
    initApp(user);
  }
}
