const assert = require('assert');
const dgram = require('dgram');
const Latches = require('latches')
const UdpBroadcast = require('..').server;

const options = {
    host: '127.0.0.1',
    port: 2278,
    timeout: 500
}

describe('UdpBroadcast', function () {
    beforeEach(function () {
        this.server = new UdpBroadcast(options);
        this.server.open();
    });

    it('is up', function (done) {
        let client = dgram.createSocket('udp4');
        client.on('message', (message, remote) => {
            client.close();
            assert.strictEqual(remote.address, options.host);
            assert.strictEqual(remote.port, options.port);
            assert.strictEqual(typeof (JSON.parse(message)), 'object');
            done();
        });
        client.send(JSON.stringify({ id: -1 }), options.port, options.host, (err, bytes) => {
            if (err) {
                client.close();
                done(err);
            }
        });
    });

    it('assigns a unique id for every request', function (done) {
        let clientNum = 5;
        let cdl = new Latches.CountDownLatch(clientNum);
        for (let i = 0; i < clientNum; i++) {
            let client = dgram.createSocket('udp4');
            client.on('message', (message, remote) => {
                client.close();
                assert.strictEqual(JSON.parse(message).id, i);
                cdl.hit();
            });
            client.send(JSON.stringify({ id: -1 }), options.port, options.host, (err, bytes) => {
                if (err) {
                    client.close();
                    done(err);
                }
            });
        }
        cdl.wait(() => {
            done();
        });
    });

    it('broadcasts messages to each client', function (done) {
        let messagetext = "Current time: " + new Date().getTime();
        let clientNum = 3;
        let cdl = new Latches.CountDownLatch(clientNum);
        this.server.on('message', (m) => {
            cdl.hit();
        });
        for (let i = 0; i < clientNum; i++) {
            let client = dgram.createSocket('udp4');
            client.on('message', (message, remote) => {
                cdl.hit();
                client.close();
                assert.strictEqual(message.toString(), messagetext);
            });
            client.send(JSON.stringify({ id: i, message: 'client ' + i }), options.port, options.host, (err, bytes) => {
                if (err) {
                    client.close();
                    done(err);
                }
            });
        }

        cdl.wait(() => {
            // all clients ready
            cdl = new Latches.CountDownLatch(clientNum);
            messageReady = true;

            assert.strictEqual(this.server.subscribers, clientNum);

            this.server.send(messagetext);

            cdl.wait(() => {
                done();
            });
        });
    });

    it('removes clients after they timeout', function (done) {
        let client = dgram.createSocket('udp4');

        this.server.on('message', (m) => {
            setTimeout(() => {
                client.close();
                assert.strictEqual(this.server.subscribers, 0);
                done();
            }, options.timeout * 3);
        });

        client.send(JSON.stringify({ id: 0, message: 'test' }), options.port, options.host, (err, bytes) => {
            if (err) {
                client.close();
                done(err);
            }
        });
    });

    it('keeps connections with a heartbeat alive', function (done) {
        let client = dgram.createSocket('udp4');
        let cdl = new Latches.CountDownLatch(1);
        intervalId = setInterval(() => {
            client.send(JSON.stringify({ id: 0 }), options.port, options.host, (err, bytes) => {
                if (err) {
                    client.close();
                    done(err);
                }
            });
            cdl.hit();
        }, options.timeout * .75);

        cdl.wait(() => {
            setTimeout(() => {
                clearInterval(intervalId);
                client.close();
                assert.strictEqual(this.server.subscribers, 1);
                done();
            }, options.timeout * 5);
        });
    })

    it('doesn\'t crash when a client closes its connection', function (done) {
        let messagetext = "Current time: " + new Date().getTime();
        let clientNum = 2;
        let clients = [];
        let cdl = new Latches.CountDownLatch(clientNum);
        this.server.on('message', (m) => {
            cdl.hit();
        });
        for (let i = 0; i < clientNum; i++) {
            let client = dgram.createSocket('udp4');
            client.on('message', (message, remote) => {
                client.close();
                cdl.hit();
                assert.strictEqual(message.toString(), messagetext);
            });
            client.send(JSON.stringify({ id: i, message: 'client ' + i }), options.port, options.host, (err, bytes) => {
                if (err) {
                    client.close();
                    done(err);
                }
            });
            clients.push(client);
        }

        cdl.wait(() => {
            cdl = new Latches.CountDownLatch(clientNum - 1);
            assert.strictEqual(this.server.subscribers, clients.length);
            clients[0].close(() => {
                this.server.send(messagetext);
                cdl.wait(() => {
                    done();
                });
            });
        })
    });

    afterEach(function () {
        this.server.close();
    });
})