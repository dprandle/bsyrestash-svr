import { send_status_error } from "./error";
import { Request, Response, NextFunction, Router } from "express";
import { MongoClient, ObjectId, Collection, InsertOneResult } from "mongodb";
import { bsyr_user } from "./users";
import jwt from "jsonwebtoken";

const secret_key = process.env.SECRET_JWT_KEY!;

declare global {
    namespace Express {
        interface Request {
            decoded_jwt?: jwt.JwtPayload | string | undefined;
        }
    }
}

// Authentication middleware
export function authenticate_jwt(req: Request, res: Response, next: NextFunction) {
    if (!req.cookies || !req.cookies.token) {
        send_status_error(401, new Error("User credentials have not been provided"), res);
    }

    const on_verify_function = (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
        if (err) {
            const stat_err = new Error("Invalid credentials");
            stat_err.cause = err;
            send_status_error(403, stat_err, res);
        }
        if (decoded) {
            req.decoded_jwt = decoded; // Attach user info to request object
        }
        next();
    };

    jwt.verify(req.cookies.token, secret_key, on_verify_function);
}

export function create_auth_routes(mongo_client: MongoClient): Router {
    const db = mongo_client.db(process.env.DB_NAME);
    const coll_name = process.env.USER_COLLECTION_NAME!;
    const users = db.collection<bsyr_user>(coll_name);

    function login(req: Request, res: Response) {
        ilog("LOGIN");
        //const { username, password } = req.body;
    }

    function logout(req: Request, res: Response) {
        ilog("LOGOUT");
        // const result: Array<bsyr_user> = await users.find().toArray();
        // res.json(result);
    }

    const auth_router = Router();
    auth_router.post("/login", login);
    auth_router.get("/logout", logout);
    return auth_router;
}
