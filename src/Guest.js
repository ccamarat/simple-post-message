import {Serializer} from './Serializer';
import {Socket} from './Socket';
import {HeartbeatProvider} from './HeartbeatProvider';
import {HeartbeatMonitor} from './HeartbeatMonitor';

const DEFAULT_SERVER_SOCKET_ID = 0;

/**
 * The "Guest" is launched by the host. Typically hosts control guests, but guests can send messages to the host as
 * well.
 */
export class Guest {

    /**
     * Signals that the guest has been configured and is ready to send / receive messages
     */
    start () {
        this._socket = new Socket(DEFAULT_SERVER_SOCKET_ID, window.opener || window.top, parseInt(window.name, 10));

        this._healthMonitor = new HeartbeatMonitor(this, [this._socket]);

        this._socket.onMessage = (...args) => {
            this.onReceiveMessage && this.onReceiveMessage(...args);
        };

        window.addEventListener('message', this._onMessage.bind(this), false);

        const heartbeat = new HeartbeatProvider(this._socket);

        // Setup an event to notify the client that we're ready to send messages
        window.addEventListener('load', () => {
            heartbeat.start();
        }, false);

        // ensure socket monitoring is active
        this._healthMonitor.start();
    }

    _onMessage (message) {
        // On page reloads when the parent window is closed, postMessage sends to itself.
        if (message.source === window) {
            return;
        }
        const packet = Serializer.deserialize(message.data);

        this._socket.handle(packet);
    }

    /**
     * Sends a message to the host.
     * @param message
     */
    sendMessage (message) {
        this._socket.send(message);
    }

    /**
     * Closes the guest window!
     */
    close () {
        window.close();
    }

    /**
     * Lookup the Host's peer ID. Useful for debugging but not much else.
     * @returns {*}
     */
    get id () {
        return this._socket.peerId;
    }
}