const EventEmitter = require('events');
const dgram = require('dgram');
const TIMEOUT = 15000;

class UdpClient extends EventEmitter {
    constructor(options = {}) {
        super();
        let port = 2278;
        let host = '127.0.0.1';
        let client = dgram.createSocket('udp4');
        let id = -1;
        let intervalId = null;
        this.heartbeat = TIMEOUT;

        if ('port' in options) {
            port = options['port'];
        }
        if ('host' in options) {
            host = options['host'];
        }
        if ('heartbeat' in options) {
            this.heartbeat = options['heartbeat'];
        }
        else if ('timeout' in options) {
            this.heartbeat = options['timeout'] / 2;
        }

        this.open = (callback) => {
            let hb = () => {
                client.send(JSON.stringify({ id }), port, host, (err, bytes) => {
                    if (err) {
                        client.close();
                        if (callback) {
                            callback(err);
                        }
                        else {
                            throw err;
                        }
                    }
                });
            };
            client.on('message', (message, remote) => {
                id = JSON.parse(message).id;
                client.removeAllListeners('message');
                client.on('message', (message, remote) => {
                    this.emit('message', message.toString());
                });
                hb();
                if (callback) {
                    callback(null, id);
                }
            });
            intervalId = setInterval(hb, this.heartbeat);
        };

        this.close = (callback) => {
            clearInterval(intervalId);
            client.close(callback);
        };

        this.send = (message, callback) => {
            if (id !== -1) {
                client.send(JSON.stringify({ id, message }), port, host, callback);
            }
        }
    }
}

module.exports = exports = UdpClient;