const assert = require('assert');
const UdpBroadcast = require('..').server;
const UdpClient = require('..').client;

const options = {
    host: '127.0.0.1',
    port: 2278,
    timeout: 500,
    heartbeat: 250
}

describe('UdpClient', function () {
    beforeEach(function () {
        this.server = new UdpBroadcast(options);
        this.server.open();
    });

    it('can establish a connection to the server', function (done) {
        let client = new UdpClient(options);
        client.open((err, id) => {
            if (err) {
                client.close();
                done(err);
            }
            else {
                client.close();
                assert.strictEqual(id, 0);
                done();
            }
        });
    });

    it('can receive a message from the server', function (done) {
        let messagetext = "Current time: " + new Date().getTime();
        let client = new UdpClient(options);
        client.on('message', (message) => {
            client.close();
            assert.strictEqual(message, messagetext);
            done();
        })
        client.open((err, id) => {
            if (err) {
                client.close();
                done(err);
            }
            else {
                setTimeout(() => {
                    this.server.send(messagetext);
                }, options.timeout);
            }
        });
    });

    it('can send a message to the server', function (done) {
        let messagetext = "Current time: " + new Date().getTime();
        let client = new UdpClient(options);
        this.server.on('message', (message) => {
            client.close();
            assert.strictEqual(message, messagetext);
            done();
        });
        client.open((err, id) => {
            if (err) {
                client.close();
                done(err);
            }
            else {
                client.send(messagetext);
            }
        });
    });

    afterEach(function () {
        this.server.close();
    });
});