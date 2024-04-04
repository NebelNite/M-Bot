require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const https = require('https');
const fs = require('fs');
const dgram = require('dgram');
const ping = require('ping');
const os = require('os');
const socketIo = require('socket.io');

const udpBroadcast = require('udp-broadcast');
const internal = require('stream');



const port = 3001;

let mBotIp = null, mBotPort = 12345;
let mbotData = undefined;

const client = dgram.createSocket('udp4');



let ipv4Addresses = [];

const networkInterfaces = os.networkInterfaces();

for (const [name, interfaces] of Object.entries(networkInterfaces)) {
  for (const interfaceDetails of interfaces) {
    if (interfaceDetails.family === 'IPv4') {
      ipv4Addresses.push(interfaceDetails);
    }
  }
}

if (ipv4Addresses.length === 0) {
  console.error('Keine IPv4-Adresse vorhanden.');
  process.exit(1);
}


const ip = ipv4Addresses[0].address;
const SUBNET_MASK = "255.255.255.0";

const ipv4AddressParts = ip.split(".").map(Number);
const subnetMaskParts = SUBNET_MASK.split(".").map(Number);

// Berechnung der Broadcast-Adresse
const broadcastAddressParts = ipv4AddressParts.map((part, i) => {
  return part | (255 - subnetMaskParts[i]);
});

// Ergebnis ausgeben
let broadcastip = broadcastAddressParts.join(".");


//const ip = '10.10.0.172';
const fixPassword = process.env.PASSWORD_HASH;

//let mBotConnectionInterval = setInterval(checkMbotConnection, 5000);


const options = {
    key: fs.readFileSync(__dirname + '/key.pem'),
    cert: fs.readFileSync(__dirname + '/cert.pem'),
    rejectUnauthorized: false
};


const app = express();

app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


const server = https.createServer(options, app);

const io = socketIo(server);


app.get('*/css/.css', function (req, res, next) {
    res.set('Content-Type', 'text/css');
    next();
});

app.get('*js/.js', function (req, res, next) {
    res.set('Content-Type', 'application/javascript');
    next();
});



app.get('/movement', requireLogin, (req, res) => {
    res.sendFile(__dirname + "/html/movement.html");
});

app.post('/movement', (req, res) => {
    if (req.session && req.session.loggedIn) {
        const command = req.body.direction; 
        console.log('Empfangener Befehl:', command);
        
        res.json({ direction: command});

    } else {
        res.redirect("/login"); 
    }
});


app.post('/sendMovement', (req, res) => {

    command = req.body;


    sendCommandToMbot(command);
    res.end();

});




app.post('/sendSpeed', (req, res) => {

    command = req.body;
    
    sendCommandToMbot(command);

    res.end();
    
});


app.post('/sendColor', (req, res) => {

    command = req.body;
    
    sendCommandToMbot(command);

    res.end();
    
});



function sendCommandToMbot(command) {

    command = command.typ + ';' + command.command;
    
    if(mbotData != undefined)
    {
        const client = dgram.createSocket('udp4');
        const buffer = Buffer.from(command.toString());
        

        client.send(buffer, 0, buffer.length, mbotData.port, mbotData.address, (error) => {
            if (error) {
                console.error(`Fehler beim Senden der Nachricht an ${mbotData.address}:${mbotData.port}:`, error);
            } else {
                console.log(`Nachricht erfolgreich an ${mbotData.address}:${mbotData.port} gesendet: ${command}`);
            }
            client.close();
        });
    }
}


let subnets = '10.10.1';

function requireLogin(req, res, next) {
    if (req.session && req.session.loggedIn) {
        
        const subnetsToScan = [subnets];

        if(mBotIp == null)
        {
            scanNetwork(subnetsToScan);
        }

        //sendBroadcastMessage("MBotDiscovery");

        listenForUdpMessages();

        return next();
    } else {
        res.redirect("/login");
    }
}




function sendBroadcastMessage(message) {

/*
    // Set the broadcast options
    const broadcastOptions = {
      host: '255.255.255.255',
      port: 1234,
      multicast: false
    };
    
    // Set the message to send
    //message = Buffer.from('hello world');

    

    // Create a UDP socket and send the broadcast message
    udpBroadcast.send(broadcastOptions, message, (error) => {
      if (error) {
        console.error('Error sending broadcast message:', error);
      } else {
        console.log('Broadcast message sent successfully!');
      }
    });

    */

    
    /*
    const client = dgram.createSocket('udp4');

    // Set the broadcast option to true
    client.setBroadcast(true);

    // Send the message to the broadcast address
    client.send(message, 0, message.length, mBotPort, '255.255.255.255', (error) => {
        if (error) {
            console.error(`Fehler beim Senden der Broadcast-Nachricht:`, error);
        } else {
            console.log(`Broadcast-Nachricht erfolgreich gesendet: ${message}`);
        }

        // Close the client after sending the message
        client.close();
    });
    */
}


function scanNetwork(subnets) {
    
    const promises = [];

    subnets.forEach(subnet => {
        for (let i = 1; i <= 255; i++) {
            const host = `${subnet}.${i}`;
            const promise = ping.promise.probe(host);
            promises.push(promise);
        }
    });

    Promise.all(promises)
        .then(results => {
            const reachableDevices = results.filter(result => result.alive).map(result => result.host);
            console.log('Erreichbare Geräte im Netzwerk:', reachableDevices);
            
            sendMessageToDevices(reachableDevices,"MBotDiscovery");

        })
        .catch(error => {
            console.error('Fehler beim Netzwerkscan:', error);
        });
}


function sendMessageToDevices(devices, message) {

    const client = dgram.createSocket('udp4');

    let promises = [];

    devices.forEach(device => {
        const promise = new Promise((resolve, reject) => {
            client.send(message, 0, message.length, 12345, device, (error) => {
                if (error) {
                    console.error(`Fehler beim Senden der Nachricht an ${device}:`, error);
                    reject(error);
                } else {
                    console.log(`Nachricht erfolgreich an ${device} gesendet: ${message}`);
                    resolve();
                }
            });
        });

        promises.push(promise);
    });


    Promise.all(promises)
        .then(() => {

            client.close();
        })
        .catch(error => {
            console.error('Fehler beim Senden der Nachrichten:', error);
            client.close();
        });
}



function listenForUdpMessages() {

    // Create a UDP server
    const server = dgram.createSocket('udp4');
    
    // Bind the server to a port and IP address
    server.bind(mBotPort, '0.0.0.0');
    
    console.log("Listening");

    // Handle incoming messages
    server.on('message', (message, remote) => {

        console.log(message.toString());

      if (message.toString() === 'MBotDiscovered') {
        console.log('Received message:', message);
        console.log('From address:', remote);

        mbotData = remote;

        // Send a response message
        const responseMessage = 'Connected to Server';
        server.send(responseMessage, remote.port, remote.address);
        
        //mBotConnectionInterval = setInterval(checkMbotConnection, 5000);


      }
    });
  
    // Close the server when the function is no longer needed
    return () => {
      server.close();
      receiveMBotData();
    };
  }
  

  function checkMbotConnection() {
    const subnetsToScan = [subnets];
    if (!mBotIp) {
      scanNetwork(subnetsToScan);
    }
  
    const message = "mBotTest";
  
    const client = dgram.createSocket('udp4');
  
    client.send(message, 0, message.length, mBotPort, mBotIp, (error) => {
      if (error) {
        console.error(`Fehler beim Senden der Testnachricht an ${mBotIp}:${mBotPort}:`, error);
        mBotIp = null;
        console.warn("Verbindung zum mBot verloren!");
      }

      client.close();
    });
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



server.listen(port, ip, () => {
    
    console.log(`Server läuft auf https://${ip}:${port}/movement`);
});




function receiveMBotData()
{
    // Create a UDP server
    const serv = dgram.createSocket('udp4');
    
    
    if(mBotIp != null)
    {
        server.bind(mBotPort, mBotIp);
        console.log("Listening/MBotData");

        // Handle incoming messages
        server.on('message', (message, remote) => {

            console.log(message.toString());
            message = message.toString();
            
            

            // Send a response message
            const responseMessage = 'Response';
            server.send(responseMessage, mBotPort, mBotIp);

            
            //mBotConnectionInterval = setInterval(checkMbotConnection, 5000);
        }
    )};   
}
