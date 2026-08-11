export class InvalidCodeError extends Error {
    constructor(message="Invalid or expired code"){
        super(message)
        this.name ="InvalidCodeError"
    }
}

export class NotFoundError extends Error {
    constructor(message="Not found"){
        super(message)
        this.name = "NotFoundError"
    }
}

export class ConflictError extends Error {
    constructor(message="Conflict"){
        super(message)
        this.name = "ConflictError"
    }
}

export class ReusedTokenError extends Error {
  constructor() {
    super('Refresh token reuse detected')
    this.name = 'ReusedTokenError'
  }
}