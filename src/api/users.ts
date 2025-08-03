import { Request, Response, Router } from "express";
import { MongoClient, ObjectId, Collection, InsertOneResult } from "mongodb";
import bc from "bcrypt";
import { send_status_error } from "./error";

export interface bsyr_user {
    _id?: ObjectId;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    pwd: string;
}

// - At least one lowercase letter (=(?=.*[a-z])=)
// - At least one uppercase letter (=(?=.*[A-Z])=)
// - At least one digit (=(?=.*\d)=)
// - At least one special character (=(?=.*[@$!%*?&#])=)
// - Minimum length of 8 characters (={8,}=)
const password_regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export function create_user_routes(mongo_client: MongoClient): Router {
    const db = mongo_client.db(process.env.DB_NAME);
    const coll_name = process.env.USER_COLLECTION_NAME!;
    const users = db.collection<bsyr_user>(coll_name);

    function create_user(req: Request, res: Response) {
        const new_user: bsyr_user = { ...req.body };

        if (!/\S+@\S+\.\S+/.test(new_user.email)) {
            send_status_error(400, "Invalid email format", res);
        }

        if (!password_regex.test(new_user.pwd)) {
            send_status_error(400, "Password does not meet minimum guidelines", res);
        }

        new_user._id = new ObjectId();
        const on_hash_complete = (err: any, hash: string) => {
            if (err) {
                send_status_error(500, err, res);
                return;
            }

            new_user.pwd = hash;
            const insert_prom = users.insertOne(new_user);
            const on_insert_success = (result: InsertOneResult<bsyr_user>) => {
                if (result.insertedId == new_user._id) {
                    res.status(201).send(new_user);
                } else {
                    send_status_error(500, "Unexpected id when creating user", res);
                }
            };
            const on_insert_fail = (reason: any) => {
                send_status_error(400, reason, res);
            };
            insert_prom.then(on_insert_success, on_insert_fail);
        };
        bc.hash(new_user.pwd, 10, on_hash_complete);
    }

    // Get a specific user by id
    function get_user_by_id(req: Request, res: Response) {
        const on_complete = (result: bsyr_user | null) => {
            if (result) {
                res.send(result);
            } else {
                send_status_error(400, "User not found", res);
            }
        };

        const on_fail = (reason: any) => {
            send_status_error(400, reason, res);
        };

        const user_pomise = users.findOne({ _id: new ObjectId(req.params.id) });
        user_pomise.then(on_complete, on_fail);
    }

    const user_router = Router();
    user_router.post("/", create_user);
    user_router.get("/:id", get_user_by_id);
    return user_router;
}
