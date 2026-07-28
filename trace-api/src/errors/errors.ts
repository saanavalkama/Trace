export class InvalidCodeError extends Error {
    constructor(message="Invalid or expired code"){
        super(message)
        this.name ="InvalidCodeError"
    }
}