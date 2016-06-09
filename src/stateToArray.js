module.exports = function(state) {
  return Array.from(Array(16)).map(function(v, i){
    return (Math.pow(2, i) & ~state) === 0;
  });
}
