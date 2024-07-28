document.getElementById("signin-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("signin-username").value;
  const password = document.getElementById("signin-password").value;

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({username, password})
    });

    const data = await response.json();

    if (response.ok && data.redirectTo) {
      window.location.href = data.redirectTo;
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.log("Error during fetch", error);
  }
});

function goToLoginPage() {
  window.location.href = "/login";
}