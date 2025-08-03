import {Response} from "express"

export function send_status_error(status_code: number, err: Error | string, res: Response) {
    elog(err);
    res.status(status_code).json(err);
}
