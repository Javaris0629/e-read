import { ErrorRequestHandler } from "express";
import { JsonWebTokenError } from "jsonwebtoken";

export const errorHandler: ErrorRequestHandler = (error, req, res, next) =>{ 
    // check if err type is jsontoken 
    if(error instanceof JsonWebTokenError) { 
        return res.status(401).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
} 