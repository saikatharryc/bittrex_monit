## Structure

[![Greenkeeper badge](https://badges.greenkeeper.io/saikatharryc/bittrex_monit.svg)](https://greenkeeper.io/)

```
.
|-- config 
|   `-- config.js
|-- db_connect.js
|-- index.js
|-- logs
|-- models
|   |-- Stats.js
|   `-- index.js
|-- package-lock.json
|-- package.json
|-- process.json.sample
|-- readme.md
`-- send_mail.js

```

### Deploy with pm2
    rename the `process.json.sample` file to process.json. and do the necessery changes to cofig.

To start command: `pm2 start process.json --env production`