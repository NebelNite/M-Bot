require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const https = require('https');
const fs = require('fs');

/*
const tls = require('tls');

const options = {
    host: '192.168.0.22', // Hier die IP-Adresse oder der Hostname des Servers angeben
    port: 3000, // Hier den Port des HTTPS-Servers angeben
    rejectUnauthorized: false // Hier angeben, ob nicht signierte Zertifikate abgelehnt werden sollen
};

const socket = tls.connect(options, () => {
    console.log('Client verbunden');
    console.log('Peer-Zertifikat: ', socket.getPeerCertificate());
});

socket.on('error', (error) => {
    console.error('Fehler bei SSL-Verbindung:', error);
});
*/

const port = 3001;
//const ip = '192.168.0.22';
const ip = '0.0.0.0';
const fixPassword = process.env.PASSWORD_HASH;

const options = {
    key: fs.readFileSync(__dirname + '/key.pem'),
    cert: fs.readFileSync(__dirname + '/cert.pem'),
    rejectUnauthorized: false
};

const app = express();

const server = https.createServer(options, app);

app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/movement', requireLogin, (req, res) => {
    res.sendFile(__dirname + "/html/movement.html");
});

app.post('/movement', (req, res) => {
    if (req.session && req.session.loggedIn) {
        const command = req.body.direction; 
        console.log('Empfangener Befehl:', command);
        
        // Hier kannst du die empfangenen Befehle verarbeiten, z.B. an deine Robotersteuerung weiterleiten

        res.json({ direction: command});

    } else {
        res.redirect("/login"); 
    }
});

function requireLogin(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return next();
    } else {
        res.redirect("/login");
    }
}

app.get('/login', (req, res) => {
    res.sendFile(__dirname + "/html/login.html");
});

function checkPassword(req, res, next) {
    const enteredPassword = req.body.password;
    if (!enteredPassword) {
        return res.status(400).send('Passwort fehlt');
    }
    

    bcrypt.compare(enteredPassword, fixPassword, (err, result) => {
        if (err || !result) {
            return res.status(401).send('Ungültiges Passwort!');
        } else {
            req.session.loggedIn = true;
            res.redirect("/movement");
        }
    });
}

app.post('/login', checkPassword);

/*
server.on('error', (error) => {
    console.error('Fehler beim Starten des HTTPS-Servers:', error);
});
server.on('clientError', (error, socket) => {
    console.error('Fehler bei eingehender HTTPS-Verbindung:', error);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
*/


server.listen(port, ip, () => {
    
    console.log(`Server läuft auf https://${"10.10.0.172"}:${port}/movement`);
});

