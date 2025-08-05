import { send_status_error } from "./error";
import { Request, Response, NextFunction, Router } from "express";
import { MongoClient, ObjectId, Collection, InsertOneResult } from "mongodb";
import { bsyr_user } from "./users";
import bc from "bcrypt";
import jwt from "jsonwebtoken";

const secret_key = process.env.SECRET_JWT_KEY!;

declare global {
  namespace Express {
    interface Request {
      liuser?: jwt.JwtPayload | string | undefined;
    }
  }
}

// Authentication middleware to verify JWT tokens
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
      req.liuser = decoded; // Attach user info to request object
    }
    next();
  };

  jwt.verify(req.cookies.token, secret_key, on_verify_function);
}

// Search for the user by the passed in username_or_email (checks both username and email fields),
// if there is a match, check the matches password against the hashed password passed in
function authenticate_user_or_fail(
  username_or_email: string,
  hashed_pwd: string,
  users: Collection<bsyr_user>,
  res: Response
) {
  const on_success = (result: bsyr_user | null) => {
    if (result && result.pwd === hashed_pwd) {
      ilog(`${username_or_email} logged in successfully`);

      const payload = {
        id: result._id?.toString(),
        username: result.username,
        first_name: result.first_name,
        last_name: result.last_name,
        email: result.email,
      };
      const token = jwt.sign(payload, secret_key, { expiresIn: "1h" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true if using https
        sameSite: "strict",
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      res.json({ message: "Login successful", user: payload });
    } else {
      send_status_error(400, new Error("Invalid username or password"), res);
    }
  };

  const on_fail = (reason: any) => {
    send_status_error(400, new Error(reason), res);
  };

  const fprom = users.findOne({ $or: [{ username: username_or_email }, { email: username_or_email }] });
  fprom.then(on_success, on_fail);
}

export function create_auth_routes(mongo_client: MongoClient): Router {
  const db = mongo_client.db(process.env.DB_NAME);
  const coll_name = process.env.USER_COLLECTION_NAME!;
  const users = db.collection<bsyr_user>(coll_name);

  const login = (req: Request, res: Response) => {
    const { username: username_or_email, password } = req.body;

    if (!username_or_email || !password) {
      send_status_error(400, new Error("Username and password are required"), res);
      return;
    }

    const on_hash_complete = (err: any, hash: string) => {
      if (err) {
        send_status_error(500, err, res);
        return;
      }
      authenticate_user_or_fail(username_or_email, hash, users, res);
    };

    // Generate password hash
    bc.hash(password, 10, on_hash_complete);
  };

  const logout = (_req: Request, res: Response) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });
    res.json({ message: "Logged out!" });
  };

  const me = (req: Request, res: Response) => {
    if (!req.liuser) {
      send_status_error(401, "User credentials have not been provided", res);
      return;
    }
    res.json(req.liuser);
  };

  const auth_router = Router();
  auth_router.post("/login", login);
  auth_router.post("/logout", logout);
  auth_router.get("/me", me);

  return auth_router;
}
