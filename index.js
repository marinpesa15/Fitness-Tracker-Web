const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const Datastore = require("nedb");
const bcrypt = require("bcrypt");
const { totalmem } = require("os");

const app = express();
const database = new Datastore( { filename: "users.db", autoload: true });
database.loadDatabase();

const workoutdb = new Datastore( {filename: "workoutEntries.db", autoload: true });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.use(session({
  secret: "0987654321",
  resave: false,
  saveUninitialized: true,
  cookie: {secure: false}
}));

app.use(express.static(path.join(__dirname, "public")));

async function signup(username, password) {
  const user = await new Promise((resolve, reject) => {
    database.findOne({ username }, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });

  if (user) {
    throw new Error("Username already taken");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { username, password: hashedPassword };

  await new Promise((resolve, reject) => {
    database.insert(newUser, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });

  return { success: true, message: "User created successfully" };
}

async function login(username, password) {
  const user = await new Promise((resolve, reject) => {
    database.findOne({ username }, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });

  if (!user) {
    throw new Error("User not found, please sign up");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new Error("Incorrect password");
  }

  return { success: true, message: "Login successful", user };
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/start.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/login/login.html"));
});

app.post("/register", async (req, res) => {
  const {username, password} = req.body;
  console.log("Register request reveived", req.body);

  if (!username || !password) {
    return res.status(400).json({success: false, message: "Username and password incorrect"});
  }

  try {
    const result = await signup(username, password);
    res.status(201).json({ success: true, message: "SignUp successful", redirectTo: "/login" });
  } catch (error) {
    if (error.message === "Username already taken") {
      res.status(409).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login request received", req.body);
  
  if (!username || !password) {
    return res.status(400).json({success: false, message: "Username and password incorrect"});
  }

  try {
    const result = await login(username, password);
    req.session.user = result.user;  // Save user session
    console.log("Session user set:", req.session.user);
    res.status(200).json({ success: true, message: "Login successful", redirectTo: "/dashboard" });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/dashboard", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "/public/dashboard/home.html"));
});

app.post("/add-workout", isAuthenticated, (req, res) => {
  const { date, duration, exercises } = req.body;
  const userId = req.session.user;

  const workoutEntry = {
    userId,
    date,
    duration,
    exercises,
  };

  workoutdb.insert(workoutEntry, (err, newDoc) => {
    if (err) {
      res.status(500).send("Error saving workout entry");
    } else {
      res.status(200).send("Workout entry added successfully");
    }
  });
});

app.get("/workout-data", isAuthenticated, (req, res) => {
  const userId = req.session.user;

  workoutdb.find({ userId }, (err, docs) => {
    if (err) {
      res.status(500).send("Error fetching workout data");
    } else {
      const aggregatedData = docs.reduce((acc, doc) => {
        const month = new Date(doc.date).getMonth() + 1;
        const year = new Date(doc.date).getFullYear();
        const key = `${year}-${month}`;

        if (!acc[key]) {
          acc[key] = { workoutCount: 0, totalDuration: 0 };
        }

        acc[key].workoutCount += 1;
        acc[key].totalDuration += doc.duration;

        return acc;
      }, {});

      const result = Object.keys(aggregatedData).map(key => ({
        date: key,
        workoutCount: aggregatedData[key].workoutCount,
        totalDuration: aggregatedData[key].totalDuration,
      }));

      res.json(result);
    }
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to logout");
    }
    res.redirect("/login");
  });
});

app.listen(3000, () => console.log("Listening on Port 3000"));