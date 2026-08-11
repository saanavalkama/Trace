import dotenv from "dotenv"

dotenv.config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" })

function required(name:string):string{
    const value = process.env[name]
    if(!value) throw new Error(`Missing required environment variable: ${name}`)
    return value
}

export const env = {
    port: Number(process.env.PORT ?? 4000),
    nodeEnv: process.env.NODE_ENV ?? "development",
    jwtSecret: required("JWT_SECRET"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    frontendUrl: process.env.FRONTEND_URL,
}