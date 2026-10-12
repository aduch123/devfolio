export function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/pages/auth.html";
    return null;
  }
  return {
    token,
    user: JSON.parse(localStorage.getItem("user") || "{}"),
  };
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/pages/auth.html";
}