import mongoose from 'mongoose'

const url = process.env.MONGO_URL 

// check if url is valid 

if(!url) throw new Error("Database url is missing") 

export const dbConnect = () => { 
    mongoose 
    .connect(url)
    .then(() => { 
        console.log("db connected")
    })
    .catch((error) => { 
        console.log("db connection failed: ", error.message)
    })
}