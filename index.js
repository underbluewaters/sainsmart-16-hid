'use strict';

const HID = require('node-hid');
const updateChecksum = require('./src/updateChecksum');
const toByteArray = require('./src/toByteArray');
const stateToArray = require('./src/stateToArray');

const RELAY_BITMAP = [128, 256, 64, 512, 32, 1024, 16, 2048, 8, 4096, 4, 8192, 2, 16384, 1, 32768];
const VID = 0x0416;
const PID = 0x5020;

/**

These other libraries did the hard work of figuring out the protocol, I just
repackaged for npm and to match my coding style.
https://github.com/mvines/relay/blob/master/relay16.js
https://github.com/ondrej1024/crelay/tree/master/relays/SainSmart-USB-16-channel

*/

class Relay {

  constructor(path) {
    if (path && path.length) {
      this.device = new HID.HID(path);
    } else {
      this.device = new HID.HID(VID, PID);
    }
    // Reset the device to ensure proper control
    this.reset();
    // Turn off all relays to begin
    this.write(0b0000000000000000);
  }

  /**
  Read Request (16 bytes):
  ----------------------------------------------------------------------------
  | CM | L | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | H | I | D | C | CS | CS |
  ----------------------------------------------------------------------------
  CM: read command (0xD2)
  L: message length (excluding checksum, 14 bytes)
  CS: checksum bytes (16 bits)

  Read Response (16 bytes)
  -------------------------------------------------------------------
  | U | U | BM | BM | U | U | U | U | U | U | U | U | U | U | U | U |
  -------------------------------------------------------------------
  U: Unknown
  BM: 16-bit representation of relay state
  */
  read(callback) {
    if (typeof callback !== 'function') {
      throw new Error("Relay.read requires a callback function");
    }
    let message = Buffer.from(new ArrayBuffer(16));
    // set the command
    message.writeUInt8(0xd2, 0);
    // set the message length
    message.writeUInt8(14, 1);
    // ... filler I guess?
    message.fill(17, 2, 10);
    // message signature
    message.write("HIDC", 10);
    // checksum gets appended based on message contents
    updateChecksum(message);
    this.device.write(toByteArray(message));
    let self = this;
    this.device.read(function(err, buffer) {
      if (err) {
        callback(err);
      } else {
        let state = buffer.readUInt16LE(2)
        let bits = "";
        for (var mask of RELAY_BITMAP) {
          bits = (((mask & state) === 0) ? "0" : "1") + bits;
        }
        var status = parseInt(bits, 2);
        self._setState(status);
        callback(null, status);
      }
    });
  }

  /**
  Write Request (16 bytes):
  ----------------------------------------------------------------------
  | CM | L | BM | BM | 0 | 0 | 0 | 0 | 0 | 0 | H | I | D | C | CS | CS |
  ----------------------------------------------------------------------
  CM: write command (0xc3)
  L: message length (excluding checksum, 14 bytes)
  BM: relay state bitmap (16 bits)
  CS: checksum bytes (16 bits)
  */
  write(settings) {
    if (typeof settings !== 'number' || settings < 0 || settings > 65535) {
      throw new Error("Must provide an integer between 0 and 65535");
    }
    this._setState(settings);
    let message = new Buffer(16);
    // set the command
    message.writeUInt8(0xc3, 0);
    // set the message length
    message.writeUInt8(14, 1);
    message.writeUInt16LE(settings, 2);
    // ... filler I guess?
    message.fill(0x00, 4, 10);
    // message signature
    message.write("HIDC", 10);
    updateChecksum(message);
    this.device.write(toByteArray(message));
  }

  // This seems to clear up any problems if the device is put into an
  // inconsistent state by either reconnection to the machine or improper
  // handling by software.
  reset() {
   this.device.write([113, 14, 113, 0, 0, 0, 17, 17, 0, 0, 72, 73, 68]);
  }

  set(relay, state) {
    if (typeof relay !== 'number' || relay > 15 || relay < 0) {
      throw new Error("Must specify relay 0-15");
    }
    // Assumes that relay state is exclusively managed by sainsmart-16-hid
    var settings = this.state;
    var mask = Math.pow(2, relay);
    if (state) {
      // turn on the relay by using an OR operation
      settings = settings | mask;
    } else {
      // Invert the mask and AND it with the current state
      settings = ~mask & settings;
    }
    this.write(settings);
  }

  _setState(state) {
    this.state = state;
    this.stateArray = stateToArray(state);
  }
}

module.exports = Relay;
