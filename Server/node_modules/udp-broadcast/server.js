const EventEmitter = require('events');
const dgram = require('dgram');
const TIMEOUT = 15000;

class UdpBroadcast extends EventEmitter {
    constructor(options = {}) {
        super();
        let port = 2278;
        let host = '127.0.0.1';
        let server = dgram.createSocket('udp4');
        let i = 0;
        let intervalId = null;
        this.subscribers = 0;
        this.connections = {};
        this.timeout = TIMEOUT;

        if ('port' in options) {
            port = options['port'];
        }
        if ('host' in options) {
            host = options['host'];
        }
        if ('timeout' in options) {
            this.timeout = options['timeout'];
        }

        server.on('listening', () => {
            this.emit('listening', server.address());
            intervalId = setInterval(() => {
                let time = new Date().getTime();
                for (let id in this.connections) {
                    if (time - this.connections[id].timestamp > this.timeout) {
                        delete this.connections[id];
                        this.subscribers--;
                    }
                }
            }, Math.min(TIMEOUT, this.timeout));
        });

        server.on('message', (message, remote) => {
            let m = JSON.parse(message);
            if (m['id'] === -1) {
                server.send(JSON.stringify({ id: i++ }), remote.port, remote.address);
            }
            else {
                remote.timestamp = new Date().getTime();
                if (!(m['id'] in this.connections)) {
                    this.subscribers++;
                }
                this.connections[m['id']] = remote;
                if ('message' in m && m.message !== null && m.message !== '') {
                    this.emit('message', m.message);
                }
            }
        });

        this.send = (message) => {
            let str = message;
            if (typeof (str) !== 'string') {
                str = JSON.stringify(str);
            }
            for (let id in this.connections) {
                server.send(str, this.connections[id].port, this.connections[id].address);
            }
        }

        this.close = () => {
            clearInterval(intervalId);
            this.connections = {};
            server.close();
        }

        this.open = () => {
            server.bind(port, host);
        }
    }

    /**
     * Open the server
     */
    open() {
    }

    /**
     * Send a message to all subscribers
     * @param {string | object} message 
     */
    send(message) {
    }

    /**
     * Close the server
     */
    close() {
    }
}

module.exports = exports = UdpBroadcast;