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
const path = require('path');
const { MongoClient } = require('mongodb');

const port = 3001;
let mbotList = [];
let mBotPort = 12345;
let sensorData = {};
const collectionName = 'sensorData';

const app = express();
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
  rejectUnauthorized: false
};

/// DB Communication API

const mongoUrl = process.env.MONGO_URL;
const dbName = 'mbotDB';
let db, sensorDataCollection;

MongoClient.connect(mongoUrl, {
  tls: true,
  tlsAllowInvalidCertificates: true
})
    .then(client => {
      console.log('Connected to MongoDB');
      db = client.db(dbName);
      sensorDataCollection = db.collection(collectionName);
    })
    .catch(error => console.error(error));

app.post('/api/sensorData', (req, res) => {
  console.log('Received POST request to /api/sensorData');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  const { volume, distance, mode } = req.body;

  if (typeof volume === 'undefined' || typeof distance === 'undefined' || typeof mode === 'undefined') {
    console.error('Invalid request body:', req.body);
    return res.status(400).send({ message: 'Invalid request body' });
  }

  const sensorData = {
    volume,
    distance,
    mode,
    timestamp: new Date()
  };

  sensorDataCollection.insertOne(sensorData)
      .then(result => {
        console.log('Sensor data stored successfully:', result);
        res.status(201).send({ message: 'Sensor data stored successfully' });
      })
      .catch(error => {
        console.error('Error storing sensor data:', error);
        res.status(500).send({ message: 'Error storing sensor data' });
      });
});

app.get('/api/sensorData/longterm', async (req, res) => {
  try {
    const data = await sensorDataCollection.find().sort({ timestamp: 1 }).toArray();
    res.json(data);
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    res.status(500).send({ message: 'Error fetching sensor data' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

const server = https.createServer(options, app);
const io = socketIo(server);

app.get('/requestSensorData', (req, res) => {
  res.json();
});

app.get('/movement', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'movement.html'));
});

app.get('/html/sensorData.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'sensorData.html'));
});

app.get('/sensorData', (req, res) => {
  res.redirect('/html/sensorData.html');
});

// Endpoint to fetch the list of M-Bots
app.get('/mbots', (req, res) => {
  res.json(mbotList);
});

app.get('/getMBotData', (req, res) => {
  res.json({ message: sensorData });
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
      const mbotIp = remote.address;
      sensorData[mbotIp] = msg;
      lastSensorDataReceivedAt = Date.now();

      // Split the sensor data string into an object
      const sensors = sensorData[mbotIp].split(';');
      const sensorDataObj = {};

      sensors.forEach(sensor => {
        const [key, value] = sensor.split(':');
        if (key && value) {
          const trimmedKey = key.trim().toLowerCase();
          if (trimmedKey !== 'lightness') { // Skip the Lightness sensor
            sensorDataObj[trimmedKey] = parseFloat(value);
          }
        }
      });

      // Ensure the object contains all necessary keys
      const { startuptimer, distance, volume } = sensorDataObj;

      if (typeof startuptimer !== 'undefined' && typeof distance !== 'undefined' && typeof volume !== 'undefined') {
        const sensorDataToSave = {
          startuptimer,
          distance,
          volume,
          timestamp: new Date()
        };

        // Save the data to MongoDB
        sensorDataCollection.insertOne(sensorDataToSave)
            .then(result => {
              console.log('Sensor data stored successfully:', result);
            })
            .catch(error => {
              console.error('Error storing sensor data:', error);
            });
      } else {
        console.error('Invalid sensor data:', sensorDataObj);
      }
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
    for (const mbotIp in sensorData) {
      if (currentTime - lastSensorDataReceivedAt > 6000 && sensorData[mbotIp] != undefined) {
        console.log('Timeout!');
        sensorData[mbotIp] = ':-1;';
      }
    }
  }, 6000);

  return () => {
    server.close();
  };
}

function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) {
    console.log('User logged in. Starting initial network scan.');
    scanNetwork(['10.10.1']); // Initial scan on login
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
  res.sendFile(path.join(__dirname, 'html', 'login.html'));
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
  const subnetsToScan = ['10.10.1'];
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
  console.log(`API endpoint for sensor data: https://${ip}:${port}/api/sensorData`);
});
