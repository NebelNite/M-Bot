//npm run start2

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');




const app = express();
const port = 3000; 
// ip = '10.10.0.172';
const ip = '192.168.0.18';


const fixPassword = process.env.PASSWORD_HASH;

app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true
}));


// Middleware für das Parsen von JSON-Daten
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))




app.get('/movement', requireLogin, (req, res) => {

    res.sendFile(process.cwd()+"/html/movement.html");

    const command = req.body.command;
    console.log('Empfangener Befehl:', command);
    
});

// Endpunkt für die Bewegungssteuerung
    app.post('/movement', (req, res) => {
        if (req.session && req.session.loggedIn) {
            const command = req.body.command;
            console.log('Empfangener Befehl:', command);

            // Hier kannst du den Befehl an den mBot senden
            res.send('Command: ' + command);
            
        } else {
            // Benutzer nicht angemeldet, leite ihn zur Login-Seite weiter
            res.redirect("http://" + ip + ":" + port + "/login");
        }
    });



function requireLogin(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return next(); // Erlaube den Zugriff auf die Seite, wenn der Benutzer angemeldet ist
    } else {
        res.redirect("http://" + ip + ":" + port + "/login");
    }
}

// Route für die Login-Seite
app.get('/login', (req, res) => {
    res.sendFile(process.cwd()+"/html/login.html");
});


function checkPassword(req, res, next) {
    
    const enteredPassword = req.body.password;

    // Überprüfe, ob das Passwort vorhanden und nicht leer ist
    if (!enteredPassword) {
        return res.status(400).send('Passwort fehlt');
    }


        bcrypt.compare(enteredPassword, fixPassword, (err, result) => {
            if (err || !result) {
                return res.status(401).send('Ungültiges Passwort!');
            } else {
                // Wenn das Passwort korrekt ist, erlaube den Zugriff auf die Movement-Seite
                req.session.loggedIn = true;
                res.redirect("http://" + ip + ":" + port + "/movement");
            }
        });
}





app.post('/login', checkPassword, (req, res) => {
    // Wenn das Passwort korrekt ist, wird die Benutzersitzung erstellt und zur Movement-Seite weitergeleitet

});




// local
/*
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}/befehl`);
});
*/

// online

app.listen(port, ip, () => {
    console.log(`Server läuft auf http://${ip}:${port}/movement`);
});

