import express from "express";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import users_api from "./api/users";
import jwt from "jsonwebtoken";

// Source map for tracing things back to typescript rather than generated javascript
import "source-map-support/register";
import { StatusError } from "./common_types";

// Extend our request type to have any additional members we need and create some aliases for console.log guys
declare global {
    namespace Express {
        interface Request {
            decoded_jwt?: jwt.JwtPayload | string | undefined;
        }
    }
    var ilog: any;
    var dlog: any;
    var wlog: any;
    var elog: any;
}
globalThis.ilog = console.log;
globalThis.dlog = console.debug;
globalThis.wlog = console.warn;
globalThis.elog = console.error;


// Load values from .env into process.env
dotenv.config();

// Create the mongodb client
const mdb_uri = process.env.MONGODB_URI!;
const secret_key = process.env.SECRET_JWT_KEY!;

if (!mdb_uri) {
    throw Error(mdb_uri);
}

const mdb_client = new MongoClient(mdb_uri);

// Error handler
function error_handler(err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) {
    elog(err);
    next(err);
}

// Authentication middleware
function authenticate_jwt(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!req.cookies || !req.cookies.token) {
        throw new StatusError(401, "User credentials have not been provided");
    }

    const on_verify_function = (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
        if (err) {
            const stat_err = new StatusError(403, "Invalid credentials");
            stat_err.cause = err;
            throw stat_err;
        }
        if (decoded) {
            req.decoded_jwt = decoded; // Attach user info to request object
        }
        next();
    };

    jwt.verify(req.cookies.token, secret_key, on_verify_function);
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
    app.use("/api", users_api.create_auth_routes(mdb_client));
    app.use("/api/users", authenticate_jwt, users_api.create_user_routes(mdb_client));

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
