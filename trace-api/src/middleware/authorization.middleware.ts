import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {env} from '../config/env'

export function requireAuth(req: Request, res:Response, next:NextFunction){
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer') ? authHeader.slice(7) : null

    if(!token){
        return res.status(401).json({message:'Missing token'})
    }

    try{
        const payload = jwt.verify(token, env.jwtSecret) as {sub:string, email: string}
        req.userId = payload.sub
        req.email = payload.email
        next()
    } catch(err){
        res.status(401).json({message:'invalid or expired token'})
    }
}