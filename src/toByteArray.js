// to bad node-hid doesn't support writing buffers
module.exports = function(buffer) {
  return buffer.toString("hex").match(/.{1,2}/g).map(function(val){
    return parseInt("0x" + val)
  });
}
