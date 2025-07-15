import express from "express";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { create_user_routes } from "./api/users";

// Source map for tracing things back to typescript rather than generated javascript
import "source-map-support/register";

const ilog = console.info;
const dlog = console.log;

// Load values from .env into process.env
dotenv.config();

// Create the mongodb client
const mdb_uri = process.env.MONGODB_URI;
if (!mdb_uri) {
    throw Error(mdb_uri);
}

const mdb_client = new MongoClient(mdb_uri);

// Error handler
function error_handler(err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) {
    ilog("Unhandled error:", err);
    next(err);
}

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
    app.use("/users", create_user_routes(mdb_client));

    // Send index.html for any route that has not been handled yet - express 5 requires the braces and the
    // word after the wildcard - before express 5 this would have have just been "*"
    app.get("/{*splat}", function (_req, res) {
        res.sendFile(path.join(__dirname, "..", "public", "index.html"));
    });

    // Error handling that occurs on throw
    app.use(error_handler);

    app.listen(process.env.PORT, () => {
        return ilog(`Express is listening at http://localhost:${process.env.PORT}`);
    });
}

start_server();
