import mongoose from 'mongoose'

const url = process.env.MONGO_URL 

// check if url is valid 

if(!url) throw new Error("Database url is missing")