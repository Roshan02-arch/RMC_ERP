const response = await fetch(
  "http://localhost:8080/api/users/admin/login",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }
);

const data = await response.json();

if (response.ok) {
  localStorage.setItem("role", data.role);
  navigate("/admin");  // 🔥 must match your route
} else {
  alert(data.message || "Login failed");
}