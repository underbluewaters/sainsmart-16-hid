# sainsmart-16-hid

Control the Sainsmart 16 relay USB HID device from node.js.

## Alpha

I'll be using this module to create an irrigation controller. Until I'm
satisfied with its meatspace operation, this should be considered alpha
software!

## Usage

`$ npm install sainsmart-16-hid`

```javascript

const Relay = require('sainsmart-16-hid');

let relay = new Relay();

// enable relays 0 and 4
relay.write(0b0000000000010001);
// enable relays 14 and 15
relay.write(Math.pow(2, 14) | Math.pow(2, 15));
// leave 14 & 15 enabled, but enable relay 5
relay.set(5, true);
// check to see if relay 14 was enabled
(Math.pow(2, 14) & ~relay.state) === 0;
// or
relay.stateArray[14] === true;
// turn off relay 14
relay.set(14, false);
```

Keep in mind that constructing a Relay object will send a reset command to the
module and set all relays to zero. This is so that your control module can begin
in a known state in the event of a crash or restart. If you need to access the
state of the usb device when set by another piece of software, consider
[another library](https://github.com/mvines/relay).


## API

### new Relay([path])

Path is optional, and can be used to specify a specific device for
[node-hid](https://github.com/node-hid/node-hid#opening-a-device). If not
specified, the first Sainsmart 16-relay USB HID device found will be used.

### relay.state

16-bit integer representation of the state of the relays. `0b0000000000000001`
means relay 0 is enabled, `0b1000000000000000` means relay 15 is enabled, etc.

### relay.stateArray

Another representation of the relay states, an array of booleans.
```javascript
relay.stateArray // relays 0, 4, and 15 are enabled
> [true, false, false, false, true, false, false, false, true, false, false, false, false, false, false, true];
```

### relay.read(callback)

Sends a read command to the USB device. `callback(err, data)` (required) will
include any error and data will be the 16-bit integer representation of the
state of the relays. `relay.state` and `relay.stateArray` will be updated when
this function completes. _Note that you shouldn't need this function_. Each time
`write` or `set` is called this information can be accessed from `relay.state`
or `relay.stateArray`.

### relay.write(state)

Used to change the state of *all* the relays on the device. For example:

```javascript
// turn on relays 0, 3, and 14. everything else off.
relay.write(0b0100000000001001);
// turn everything off except relays 5 & 6
relay.write(Math.pow(2, 5) | Math.pow(2, 6));
```

### relay.set(relay, state)

Turn a specific relay on or off, without affecting the state of other relays.

```javascript
relay.write(Math.pow(2, 1) | Math.pow(2, 15));
relay.set(15, false);
relay.set(14, true);
relay.stateArray
> [false, true, false, false, false, false, false, false, false, false, false, false, false, true, false]
```

## Credit

All credit goes to [mvines/relay](https://github.com/mvines/relay) for
documenting the protocol for communicating with this device. I just made an API
that fits my needs.
