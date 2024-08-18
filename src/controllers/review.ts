import BookModel from "@/models/book";
import ReviewModel from "@/models/review";
import { AddReviewRequestHandler } from "@/types";
import { sendErrorResponse } from "@/utils/helper";
import { RequestHandler } from "express";
import { ObjectId, Types, isValidObjectId } from "mongoose";

export const addReview: AddReviewRequestHandler = async (req, res) => { 
    // get book info from client 
    const { bookId, rating, content } = req.body 

    // update book, user and content. 
    await ReviewModel.findOneAndUpdate( 
        { book: bookId, user: req.user.id }, 
        { content, rating },
        { upsert: true }
    )

    // process new rating with old ratings to generate averageRating 
    const [result] = await ReviewModel.aggregate<{averageRating: number}>([ 
        { 
            $match: { 
                book: new Types.ObjectId(bookId) // maping rating results to book object
            }, 
        }, 
      { 
        // group operation takes all book ratings and groups them for average rating value
        $group: { 
            _id: null, 
            averageRating: {$avg: "$rating"}, 
        }
      }
    ])
    // update book average rating inside books collection
    await BookModel.findByIdAndUpdate(bookId, { 
        averageRating: result.averageRating
    })

    res.json({ 
        message: "Review updated"
    })
}

export const getReview: RequestHandler = async (req, res) => { 
    const { bookId } = req.params // get book from url params 

    // check if bookId has a valid objectId 
    if(!isValidObjectId(bookId)) 
        return sendErrorResponse({ 
        res, 
        message: "Book Id is not valid", 
        status: 422,
    })

    // if valid, get book review from client 
    const review = await ReviewModel.findOne({ book: bookId, user: req.user.id }) 

    if(!review) 
        return sendErrorResponse({  
        res, 
        message: "Review not found", 
        status: 404
    })

    res.json({ 
        content: review.content, 
        rating: review.rating
     })
}

interface PopulatedUser { 
 _id: ObjectId 
 name: string 
 avatar: { id: string; url: string }   
}

// get public reviews from the users 
export const getPublicReviews: RequestHandler = async (req, res) => { 
    const reviews = await ReviewModel.find({ book: req.params.bookId }).populate<{ 
        user: PopulatedUser
    }>({ path: "user", select: "name avatar" })

    // returm json object of book reviews and users who made a review 
    res.json({ 
        reviews: reviews.map((r) => { 
            return { 
                id: r._id, 
                content: r.content, 
                date: r.createdAt.toISOString().split("T")[0], 
                rating: r.rating, 
                user: { 
                    id: r.user._id, 
                    name: r.user.name, 
                    avatar: r.user.avatar,
                },
            };
        }),
    })
}