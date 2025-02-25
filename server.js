const express = require("express");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const csv = require("fast-csv");
const session = require("express-session");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();
const PORT = 3000;
const USERS_FILE = "users.csv";
app.use(express.json());


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("views"));
app.use(
  session({
    secret: "secretKey",
    resave: false,
    saveUninitialized: true,
  })
);
// 📌 Page d'accueil
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
// 📌 Page d'accueil
app.get("/home", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
// 📌 Page d'annonces
app.get("/user", (req, res) => {
  res.sendFile(__dirname + "/views/organisateur.html");
});
// 📌 Formulaire d'inscription
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/views/register.html");
});
// 📌 Formulaire de connexion
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/views/login.html");
});
app.get("/dj_dashboard", (req, res) => {
  res.sendFile(__dirname + "/views/dj_dashboard.html");
});

// 🚀 Route pour l'inscription
app.post("/register", (req, res) => {
  const { role, username, password, confirm_password, residance, experience, km, pro, style,email,tarif } = req.body;
  // Vérification des champs obligatoires
  if (!role || !username || !password || !confirm_password || (role === "dj" && !residance)) {
    
      return res.send("❌ Veuillez remplir tous les champs obligatoires.");
  }

  // Vérification des mots de passe
  if (password !== confirm_password) {
      return res.send("❌ Les mots de passe ne correspondent pas.");
  } 

  let userExists = false;
  
  fs.createReadStream(USERS_FILE)
      .pipe(csv.parse({ headers: false }))
      .on("data", (row) => {
          if (row[0] === username) {
              userExists = true;
          }
      })
      .on("end", () => {
          if (userExists) {
              return res.send("❌ Ce nom d'utilisateur est déjà pris.");
          }

          // Hachage du mot de passe
          bcrypt.hash(password, 10, (err, hashedPassword) => {
              if (err) return res.send("❌ Erreur lors du hashage du mot de passe.");

              let user;
              if (role === "dj") {
                  user = `${username},${hashedPassword},DJ,${email},${residance},${experience || 0},${km || 0},${pro},${style},${tarif}\n`;
              } else {
                  user = `${username},${hashedPassword},Organisateur,${email}${residance}\n`;
              }

              // Ajout de l'utilisateur dans le fichier CSV
              fs.appendFile(USERS_FILE, user, (err) => {
                  if (err) return res.send("❌ Erreur lors de l'enregistrement.");
                  res.send("✅ Inscription réussie ! <a href='/login'>Se connecter</a>");
              });
          });
      });
});
// 🚀 Route pour la mise à jour du profil DJ
app.post("/update-dj-profile", (req, res) => {
  if (!req.session.user || req.session.user.role !== "DJ") {
    return res.status(403).send("❌ Accès interdit.");
  }

  const { username } = req.session.user;
  const { experience, km, pro, style,tarif } = req.body;

  let users = [];
  let userUpdated = false;

  fs.createReadStream(USERS_FILE)
    .pipe(csv.parse({ headers: false }))
    .on("data", (row) => {
      if (row[0] === username) {
        row[5] = experience || row[5];
        row[6] = km || row[6];
        row[7] = pro || row[7];
        row[8] = style || row[8];
        row[9] = tarif || row[9];
        userUpdated = true;
      }
      users.push(row);
    })
    .on("end", () => {
      if (!userUpdated) {
        return res.status(404).send("❌ Utilisateur non trouvé.");
      }

      const writableStream = fs.createWriteStream(USERS_FILE);
      const csvStream = csv.format({ headers: false });
      csvStream.pipe(writableStream);
      users.forEach((user) => csvStream.write(user));
      csvStream.end();

      res.send("✅ Profil mis à jour avec succès !");
    });
});

// 🚀 Route pour la connexion
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  let found = false;

  fs.createReadStream(USERS_FILE)
    .pipe(csv.parse({ headers: false }))
    .on("data", (row) => {
      if (row[0] === username) {
        found = true;
        bcrypt.compare(password, row[1], (err, result) => {
          if (result) {
            req.session.user = {
              username: row[0],
              role: row[2],
              experience: row[5] || null,
              style: row[8] || null
            };

            if (row[2] === "DJ") {
              res.redirect("/dj_dashboard"); // Redirige vers un espace DJ
            } else {
              res.redirect("/user");
            }
          } else {
            res.send("Mot de passe incorrect.");
          }
        });
      }
    })
    .on("end", () => {
      if (!found) res.send("Utilisateur non trouvé.");
    });
});
app.get("/search-djs", async (req, res) => {
  const rows = [];

  fs.createReadStream(USERS_FILE)
      .pipe(csv.parse({ headers: false }))
      .on("data", (row) => {
          if (row[2] === "DJ") { 
              rows.push(row);
          }
      })
      .on("end", async () => {
          const djs = rows.map(row => ({
              name: row[0],
              email: row[3],
              residence: row[4], // La ville uniquement
              experience: parseInt(row[5], 10),
              kmMax: parseInt(row[6], 10),
              type: row[7],
              style: row[8],
              tarif: parseFloat(row[9]) || 0 // Ajout du tarif
          }));

          res.json(djs);
      });
});



// 🚀 Route pour la déconnexion
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/home");
  });
});
// 🚀 Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});