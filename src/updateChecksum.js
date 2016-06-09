module.exports = function(buffer) {
  var cs = buffer.slice(0, 14).reduce((a, b) => a+b, 0);
  buffer.writeUInt16LE(cs, 14); // protocol is little-endian
}
