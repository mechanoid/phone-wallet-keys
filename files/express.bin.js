#!/usr/bin/env node

import { readFileSync } from "fs";
import { createServer } from "https";
import app from "../index.js";

const config = {
  port: process.env.PORT,
  ssl: {
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH
  }
};

const listener =
  config.ssl.key && config.ssl.cert
    ? createServer(
        {
          key: readFileSync(config.ssl.key),
          cert: readFileSync(config.ssl.cert)
        },
        app(config)
      )
    : app(config);

const server = listener.listen(config.port, () => {
  console.log(`listening to port: ${server.address().port}`);
});
