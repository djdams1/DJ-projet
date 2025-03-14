const fs = require("fs");
const bcrypt = require("bcryptjs");
const csv = require("fast-csv");

const ADMIN_FILE = "admins.csv";

// Vérifier si le fichier admin existe, sinon le créer
if (!fs.existsSync(ADMIN_FILE)) {
    fs.writeFileSync(ADMIN_FILE, "username,password,email\n"); // En-tête CSV
}

// Fonction pour ajouter un admin
function addAdmin(username, password, email) {
    // Hacher le mot de passe
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error("Erreur lors du hashage :", err);
            return;
        }

        // Vérifier si l'admin existe déjà
        let admins = [];
        let exists = false;

        fs.createReadStream(ADMIN_FILE)
            .pipe(csv.parse({ headers: false }))
            .on("data", (row) => {
                admins.push(row);
                if (row[0] === username) {
                    exists = true;
                }
            })
            .on("end", () => {
                if (exists) {
                    console.log("❌ Cet admin existe déjà !");
                } else {
                    // Ajouter l'admin
                    admins.push([username, hashedPassword, email]);

                    // Réécrire tout le fichier
                    const writableStream = fs.createWriteStream(ADMIN_FILE);
                    const csvStream = csv.format({ headers: false });

                    csvStream.pipe(writableStream);
                    admins.forEach((admin) => csvStream.write(admin));
                    csvStream.end();

                    console.log("✅ Admin ajouté avec succès !");
                }
            });
    });
}

// 🔥 Exécuter la fonction avec un admin
const username = "admin_john";
const password = "supersecurise";
const email = "admin@mail.com";

addAdmin(username, password, email);
