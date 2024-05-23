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
const { MongoClient } = require('mongodb');

const port = 3001;
let mbotList = [];
let mBotPort = 12345;
let mbotData = undefined;

const app = express();
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const options = {
  key: fs.readFileSync(__dirname + '/key.pem'),
  cert: fs.readFileSync(__dirname + '/cert.pem'),
  rejectUnauthorized: false
};

const server = https.createServer(options, app);
const io = socketIo(server);

let sensorData = undefined;

app.get('/requestSensorData', (req, res) => {
  res.json();
});

app.get('/movement', requireLogin, (req, res) => {
  res.sendFile(__dirname + "/html/movement.html");
});

app.get('/html/sensorData.html', (req, res) => {
  res.sendFile(__dirname + '/html/sensorData.html');
});

app.get('/sensorData', (req, res) => {
  res.redirect('/html/sensorData.html');
});

app.get('/getMBotData', (req, res) => {
  res.json({ message: sensorData });
});

// Endpoint to fetch the list of M-Bots
app.get('/mbots', (req, res) => {
  res.json(mbotList);
});

app.post('/sendMovement', (req, res) => {
  const { command, selectedMbots } = req.body;
  console.log(`sendMovement received: command=${JSON.stringify(command)}, selectedMbots=${JSON.stringify(selectedMbots)}`);
  sendCommandToMbot(command, selectedMbots);
  res.send({ message: "Received" });
  res.end();
});

app.post('/sendSpeed', (req, res) => {
  const { command, selectedMbots } = req.body;
  console.log(`sendSpeed received: command=${JSON.stringify(command)}, selectedMbots=${JSON.stringify(selectedMbots)}`);
  sendCommandToMbot(command, selectedMbots);
  res.end();
});

app.post('/sendColor', (req, res) => {
  const { command, selectedMbots } = req.body;
  console.log(`sendColor received: command=${JSON.stringify(command)}, selectedMbots=${JSON.stringify(selectedMbots)}`);
  sendCommandToMbot(command, selectedMbots);
  res.end();
});

app.post('/playSound', (req, res) => {
  const { command, selectedMbots } = req.body;
  console.log(`playSound received: command=${JSON.stringify(command)}, selectedMbots=${JSON.stringify(selectedMbots)}`);
  sendCommandToMbot(command, selectedMbots);
  res.end();
});

app.post('/sendLineFollower', (req, res) => {
  const { command, selectedMbots } = req.body;
  console.log(`sendLineFollower received: command=${JSON.stringify(command)}, selectedMbots=${JSON.stringify(selectedMbots)}`);
  sendCommandToMbot(command, selectedMbots);
  res.end();
});

function sendCommandToMbot(command, selectedMbots) {
  command = command.typ + ';' + command.command;
  console.log(`Sending command: ${command} to mBots: ${selectedMbots}`);
  selectedMbots.forEach(mbotIp => {
    const client = dgram.createSocket('udp4');
    const buffer = Buffer.from(command);
    client.send(buffer, 0, buffer.length, mBotPort, mbotIp, (error) => {
      if (error) {
        console.error(`Error sending message to ${mbotIp}:${mBotPort}:`, error);
      } else {
        console.log(`Message successfully sent to ${mbotIp}:${mBotPort}: ${command}`);
      }
      client.close();
    });
  });
}

function listenForUdpMessages() {
  const server = dgram.createSocket('udp4');
  server.bind(mBotPort, '0.0.0.0');
  console.log("Listening for UDP messages");

  server.on('message', (message, remote) => {
    const msg = message.toString();
    console.log(`Received message: ${msg} from ${remote.address}:${remote.port}`);
    if (msg !== 'MBotDiscovered') {
      sensorData = msg;
      lastSensorDataReceivedAt = Date.now();
    }

    if (msg === 'MBotDiscovered') {
      const mbotIp = remote.address;
      if (!mbotList.some(mbot => mbot.ip === mbotIp)) {
        mbotList.push({ ip: mbotIp });
        console.log(`New mBot added: ${mbotIp}`);
      }

      const responseMessage = 'Connected to Server';
      server.send(responseMessage, remote.port, remote.address, (err) => {
        if (err) {
          console.error(`Error responding to mBot at ${remote.address}:${remote.port}:`, err);
        } else {
          console.log(`Response sent to mBot at ${remote.address}:${remote.port}`);
        }
      });
    }
  });

  setInterval(() => {
    const currentTime = Date.now();
    if (currentTime - lastSensorDataReceivedAt > 6000 && sensorData != undefined) {
      console.log('Timeout!');
      sensorData = ':-1;';
    }
  }, 6000);

  return () => {
    server.close();
  };
}

function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) {
    console.log('User logged in. Starting initial network scan.');
    scanNetwork(['10.10.3']); // Initial scan on login
    startPeriodicScan();
    listenForUdpMessages();
    return next();
  } else {
    res.redirect("/login");
  }
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
      console.log('Reachable devices in the network:', reachableDevices);
      sendMessageToDevices(reachableDevices, "MBotDiscovery");
    })
    .catch(error => {
      console.error('Error during network scan:', error);
    });
}

function sendMessageToDevices(devices, message) {
  const client = dgram.createSocket('udp4');
  let promises = [];
  devices.forEach(device => {
    const promise = new Promise((resolve, reject) => {
      client.send(message, 0, message.length, 12345, device, (error) => {
        if (error) {
          console.error(`Error sending message to ${device}:`, error);
          reject(error);
        } else {
          console.log(`Message successfully sent to ${device}: ${message}`);
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
      console.error('Error sending messages:', error);
      client.close();
    });
}

let lastSensorDataReceivedAt = 0;

app.get('/login', (req, res) => {
  res.sendFile(__dirname + "/html/login.html");
});

function checkPassword(req, res, next) {
  const enteredPassword = req.body.password;
  if (!enteredPassword) {
    return res.status(400).send('Password missing');
  }

  bcrypt.compare(enteredPassword, process.env.PASSWORD_HASH, (err, result) => {
    if (err || !result) {
      return res.status(401).send('Invalid password!');
    } else {
      req.session.loggedIn = true;
      res.redirect("/movement");
    }
  });
}

app.post('/login', checkPassword);

function startPeriodicScan() {
  const subnetsToScan = ['10.10.3'];
  setInterval(() => {
    console.log('Periodic network scan started.');
    scanNetwork(subnetsToScan);
  }, 60000); // Adjust the interval as needed (e.g., every 60 seconds)
}

server.listen(port, () => {
  const networkInterfaces = os.networkInterfaces();
  let ip;
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        ip = address.address;
        break;
      }
    }
    if (ip) break;
  }
  console.log(`Server running at https://${ip}:${port}/movement`);
});
