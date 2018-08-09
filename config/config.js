const Joi = require("joi");

const envs = process.env;
let config = {};

const config_schema = Joi.object().keys({
  db: {
    uri: Joi.string().required(),
    options: {
      reconnectTries: Joi.number().required(),
      reconnectInterval: Joi.number().required(),
      keepAlive: Joi.number().required(),
      autoReconnect: Joi.boolean().required(),
      poolSize: Joi.number().required()
    }
  },
  smtp_credentials: {
    smtp_host: Joi.string().required(),
    port: Joi.number().required(),
    user: Joi.string().required(),
    pass: Joi.string().required(),
    send_to: Joi.string().required(),
    from_data: Joi.string().required()
  },
  req_uri: {
    market: Joi.string().required(),
    latest_tick: Joi.string().required()
  }
});

if (process.env.ENV == "prod") {
  config.db = {
    uri: envs.DB_URI,
    options: {
      // replicaSet: "rs0",
      reconnectTries: Number.MAX_VALUE,
      reconnectInterval: 500, // Reconnect every 500ms
      keepAlive: 120,
      autoReconnect: true,
      poolSize: 20
    }
  };
  config.smtp_credentials = {
    smtp_host: envs.SMTP_HOST,
    port: envs.SMTP_PORT,
    user: envs.SMTP_USER,
    pass: envs.SMTP_PASS,
    send_to: envs.SEND_TO,
    from_data: '"i came from Saikats assignment" <saikatchakrabortty2@gmail.com@>'
  };
  config.req_uri = {
    market: envs.MARKET,
    latest_tick: envs.LATEST_TICK
  };
} else {
  //do something else
}
//Just to make sure  Every Item is there.
Joi.validate(config, config_schema, err => {
  if (err) {
    throw err;
  }
});
// in runtime lets not allow anything to change value of any key[as much as possible]
Object.freeze(config);

module.exports = config;
