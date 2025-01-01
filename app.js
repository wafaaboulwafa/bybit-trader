console.log("Hello there");

const { startServer } = require("./server");

function onCandle(data) {
  console.log("data: ", JSON.stringify(data));
}

startServer(onCandle);
