
// Frigggin class bull shit - this is really making me not want to use typescript at all...
export class StatusError extends Error {
    status: number;
    constructor(status: number, message?: string) {
        super(message);
        this.status = status;
    }
}
