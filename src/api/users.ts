import { Request, Response, Router } from "express";
import { MongoClient, ObjectId, WithId, Document } from "mongodb";

interface bsyr_user {
    _id?: ObjectId;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

export function create_user_routes(mongo_client: MongoClient):Router {
    const db = mongo_client.db(process.env.DB_NAME);
    const coll_name = process.env.USER_COLLECTION_NAME;
    if (!coll_name) {
        throw "Invalid collection name";
    }

    const users = db.collection<bsyr_user>(coll_name);

    async function create_user(req: Request, res: Response) {
        const new_user:bsyr_user = {...req.body};

        if (!/\S+@\S+\.\S+/.test(new_user.email)) {
            throw "Invalid email format";
        }        

        new_user._id = new ObjectId();
        await users.insertOne(new_user);
        res.status(201).send(new_user);
    }

    // List all users
    async function list_users(req: Request, res: Response) {
        const result:Array<bsyr_user> = await users.find().toArray();
        res.json(result);
    }

    // Get a specific user by email
    async function get_user_by_email(req: Request, res: Response) {
        const user = await users.findOne({ email: req.params.email });
        if (!user) {
            res.status(404).send();
        } else {
            res.send(user);
        }
    }

    // Get a specific user by id
    async function get_user_by_id(req: Request, res: Response) {
        const user = await users.findOne({ email: req.params.id });
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
