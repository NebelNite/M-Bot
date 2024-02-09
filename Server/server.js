//npm run start2
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');


const app = express();
const port = 3000; 
const ip = '10.10.0.172';

const password = process.env.PASSWORD_HASH;


// Middleware für das Parsen von JSON-Daten
app.use(bodyParser.json());

// Endpunkt für die Befehlsverarbeitung
app.post('/befehl', (req, res) => {
    const command = req.body.command;
    console.log('Empfangener Befehl:', command);

    // Hier kannst du den Befehl an den mBot senden

    res.send('Befehl empfangen und verarbeitet');
});



app.get('/movement',requireLogin, (req, res) => {

    res.sendFile(process.cwd()+"/html/movement.html");

    const command = req.body.command;
    console.log('Empfangener Befehl:', command);
    
});

// Endpunkt für die Bewegungssteuerung
app.post('/movement', (req, res) => {
    const command = req.body.command;
    console.log('Empfangener Befehl:', command);

    
    // Hier kannst du den Befehl an den mBot senden

    res.send('Command: ', command);
});


app.use(session({
    secret: 'mysecret', // Geheimnis zur Signierung der Sitzungs-Cookies
    resave: false,
    saveUninitialized: true
}));

function requireLogin(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return next(); // Erlaube den Zugriff auf die Seite, wenn der Benutzer angemeldet ist
    } else {
        //res.redirect(process.cwd()+"/html/login.html"); // Benutzer zur Login-Seite umleiten, wenn nicht angemeldet
    }
}
// Route für die Login-Seite
app.get('/login', (req, res) => {
    res.sendFile(process.cwd()+"/html/login.html");
});

function checkPassword(req, res, next) {
    const enteredPassword = req.body.password;
    // Vergleiche das eingegebene Passwort mit dem gespeicherten, nachdem es entschlüsselt wurde
    bcrypt.compare(enteredPassword, password, (err, result) => {
        if (err || !result) {
            res.status(401).send('Ungültiges Passwort!');
        } else {
            next(); // Erlaube den Zugriff auf die Movement-Seite
        }
    });
}





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

