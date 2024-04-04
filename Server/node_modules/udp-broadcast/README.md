# udp-broadcast

[![Travis build](https://img.shields.io/travis/CorySanin/udp-broadcast)](https://travis-ci.org/CorySanin/udp-broadcast) 
[![npm downloads](https://img.shields.io/npm/dt/udp-broadcast)](https://www.npmjs.com/package/udp-broadcast)
[![npm bundle size](https://img.shields.io/bundlephobia/min/udp-broadcast)](https://bundlephobia.com/result?p=udp-broadcast)
[![David](https://img.shields.io/david/dev/CorySanin/udp-broadcast)](https://david-dm.org/CorySanin/udp-broadcast?type=dev)
[![License](https://img.shields.io/github/license/CorySanin/udp-broadcast)](https://github.com/CorySanin/udp-broadcast/blob/master/LICENSE)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/CorySanin/udp-broadcast)](https://github.com/CorySanin/udp-broadcast/blob/master/package.json)

A simple Node module for broadcasting UDP messages to a list of subscribers!

I couldn't find anything that did what I wanted so I made my own.

## Usage
### Server

```
const UdpBroadcast = require('udp-broadcast').server;

let udpbroadcast = new UdpBroadcast({
    port: 2278,
    host: '0.0.0.0',
    timeout: 15000
});

udpbroadcast.addEventListener('message', (message) => {console.log(message)});

udpbroadcast.send('Hello, everyone.');

udpbroadcast.send({timestamp: new Date().getTime(), message: 'Greetings.'});
```

### Client

```
const UdpClient = require('udp-broadcast').client;

let udpclient = UdpClient({
    port: 3616,
    host: '127.0.0.1',
    heartbeat: 7500‬
});

udpclient.on('message', (message) => {console.log(message)});

udpclient.open((err, id) => {
    if(err){
        console.log(err);
    }
    else{
        udpclient.send('Hello to you, too.');
    }
});
```

### Custom Client

In order to implement a client for udp-broadcast, it must communicate using the following, easy to implement protocol:

Client sends `{ "id": -1 }`

Server responds with `{ "id": x }` where x is the id that the client must use for all messages until it closes its connection.

Client sends `{ "id": x }` every y seconds, where y is strictly less than the timeout being used by the server.

When a message must be sent back to the server, the format for the message is `{ "id": x, "message": "this is the body of the message." }`.

Messages sent from the broadcast server don't get formatted so it's up to you to find out whether to expect plain text or JSON.
