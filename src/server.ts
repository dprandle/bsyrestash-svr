import express from "express";
import path from "path";
import dotenv from "dotenv";
import cookie_parser from "cookie-parser";
import os from "os";
import { MongoClient } from "mongodb";
dotenv.config();

// Dotenv.config should be called before loading other modules or else the globals there won't be defined
import { create_user_routes } from "./api/users";
import { authenticate_jwt, create_auth_routes } from "./api/auth";

// Source map for tracing things back to typescript rather than generated javascript
import "source-map-support/register";

// Extend our request type to have any additional members we need and create some aliases for ilog guys
declare global {
  var ilog: any;
  var dlog: any;
  var wlog: any;
  var elog: any;
  var asrt: any;
}
globalThis.ilog = console.log;
globalThis.dlog = console.debug;
globalThis.wlog = console.warn;
globalThis.elog = console.error;
globalThis.asrt = console.assert;

// Load values from .env into process.env
dotenv.config();

// Create the mongodb client
const mdb_uri = process.env.MONGODB_URI!;
const port = process.env.PORT!;
asrt(port);
asrt(mdb_uri);

const mdb_client = new MongoClient(mdb_uri);

function get_local_ip() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip over internal (i.e., 127.0.0.1) and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

async function start_server() {
  await mdb_client.connect();
  ilog("Connected to db");
  const app = express();
  app.use(cookie_parser());
  // Set up a debug view of requests
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    dlog("Request URL:", req.url);
    next();
  });

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(express.json());
  app.use("/api", create_auth_routes(mdb_client));
  app.use("/api/users", create_user_routes(mdb_client));

  // Send index.html for any route that has not been handled yet - express 5 requires the braces and the
  // word after the wildcard - before express 5 this would have have just been "*"
  app.get("/{*splat}", function (_req, res) {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  // Handle 404s
  app.listen(port, (err?: Error) => {
    if (err) {
      elog("Server failed to start:", err);
      return;
    }

    const local_ip = get_local_ip();
    ilog(`Server listening at:`);
    ilog(`- Local:   http://localhost:${port}`);
    ilog(`- Network: http://${local_ip}:${port}`);
  });
}

start_server();
