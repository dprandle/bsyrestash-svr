import { Request, Response, Router } from "express";
import { MongoClient, ObjectId, Collection } from "mongodb";
import { StatusError } from "../common_types";

export interface bsyr_user {
    _id?: ObjectId;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    hashed_pwd: string;
}

function get_users_collection(mongo_client: MongoClient): Collection<bsyr_user> {
    const db = mongo_client.db(process.env.DB_NAME);
    const coll_name = process.env.USER_COLLECTION_NAME!;
    return db.collection<bsyr_user>(coll_name);
}

export function create_user_routes(mongo_client: MongoClient): Router {
    const users = get_users_collection(mongo_client);

    async function create_user(req: Request, res: Response) {
        const new_user: bsyr_user = { ...req.body };

        if (!/\S+@\S+\.\S+/.test(new_user.email)) {
            throw new StatusError(400, "Invalid email format");
        }

        new_user._id = new ObjectId();
        await users.insertOne(new_user);
        res.status(201).send(new_user);
    }

    // List all users
    async function list_users(req: Request, res: Response) {
        const result: Array<bsyr_user> = await users.find().toArray();
        res.json(result);
    }

    // Get a specific user by email
    async function get_user_by_email(req: Request, res: Response) {
        const user = await users.findOne({ email: req.params.email });
        if (!user) {
            throw new StatusError(404, "Could not find user with email " + req.params.email);
            res.status(404).send();
        } else {
            res.send(user);
        }
    }

    // Get a specific user by id
    async function get_user_by_id(req: Request, res: Response) {
        const user = await users.findOne({ _id: new ObjectId(req.params.id) });
        if (!user) {
            res.status(404).send();
        } else {
            res.send(user);
        }
    }

    const user_router = Router();
    user_router.post("/", create_user);
    user_router.get("/", list_users);
    user_router.get("/:id", get_user_by_id);
    user_router.get("/email/:email", get_user_by_email);
    return user_router;
}

export function create_auth_routes(mongo_client: MongoClient): Router {
    const users = get_users_collection(mongo_client);

    async function login(req: Request, res: Response) {
        ilog("LOGIN");
        //const { username, password } = req.body;
    }

    async function logout(req: Request, res: Response) {
        ilog("LOGOUT");
        // const result: Array<bsyr_user> = await users.find().toArray();
        // res.json(result);
    }

    const auth_router = Router();
    auth_router.post("/login", login);
    auth_router.get("/logout", logout);
    return auth_router;
}

export * as default from "./users";
