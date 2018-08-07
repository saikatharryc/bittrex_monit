let config = {}
 config.db={
     uri:'mongodb://saikat_t:saikat95@ds135866.mlab.com:35866/taskerdb',
     options: {
        // replicaSet: "rs0",
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 500, // Reconnect every 500ms
        keepAlive: 120,
        autoReconnect: true,
        poolSize: 20,
        reconnectTries: Number.MAX_VALUE,
        // sets the delay between every retry (milliseconds)
        reconnectInterval: 1000
      }
 }

 Object.freeze(config);
 module.exports = config
