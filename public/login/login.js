document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const response = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({username, password})
  });

  const data = await response.json();

  if (data.success) {
    window.location.href = data.redirectTo;
  } else {
    alert(data.message);
  }
});

function register() {
    window.location.href = "/";
}
