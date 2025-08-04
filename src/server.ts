import express from "express";
import path from "path";
import dotenv from "dotenv";
import { create_user_routes } from "./api/users";
import { authenticate_jwt, create_auth_routes } from "./api/auth";
import { MongoClient } from "mongodb";

// Source map for tracing things back to typescript rather than generated javascript
import "source-map-support/register";

// Extend our request type to have any additional members we need and create some aliases for console.log guys
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
asrt(mdb_uri);

const mdb_client = new MongoClient(mdb_uri);

async function start_server() {
  await mdb_client.connect();
  ilog("Connected to db");
  const app = express();

  // Set up a debug view of requests
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    dlog("Request URL:", req.url);
    next();
  });

  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(express.json());
  app.use("/api", create_auth_routes(mdb_client));
  app.use("/api/users", authenticate_jwt, create_user_routes(mdb_client));

  // Send index.html for any route that has not been handled yet - express 5 requires the braces and the
  // word after the wildcard - before express 5 this would have have just been "*"
  app.get("/{*splat}", function (_req, res) {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  app.listen(process.env.PORT, () => {
    return ilog(`Express is listening at http://localhost:${process.env.PORT}`);
  });
}

start_server();
