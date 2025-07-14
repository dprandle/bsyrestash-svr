import express from "express";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { create_user_routes } from "./api/users";

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
function error_handler(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    ilog("Unhandled error:", err);
    next(err);
}

async function start_server() {
    await mdb_client.connect();
    const app = express();
    app.use(express.static(path.join(__dirname, "../public")));
    app.use(express.json());
    app.use(create_user_routes(mdb_client));
    app.use(error_handler);
    app.listen(process.env.PORT, () => {
        return ilog(`Express is listening at http://localhost:${process.env.PORT}`);
    });
}

start_server();
