import AuthorModel from "@/models/author";
import { BookDoc } from "@/models/book";
import UserModel from "@/models/user";
import { RequestAuthorHandler } from "@/types";
import { formatUserProfile, sendErrorResponse } from "@/utils/helper";
import { RequestHandler } from "express";
import slugify from "slugify";

export const registerAuthor: RequestAuthorHandler = async (req, res) => { 
    const { body, user } = req

    // check if user is signed in to register as author
    if(!user.signedUp) { 
        return sendErrorResponse({ 
            res, 
            message: "User has to be logged in before registering as author", 
            status: 404, 
        })
    } 
    // create new author and slugify id.
        const newAuthor = new AuthorModel({ 
            name:body.name, 
            about: body.about, 
            userId: user.id, 
            socialLinks: body.socialLinks,
        })

        const uniqueSlug = slugify(`${newAuthor.name} ${newAuthor.id}`, { 
            lower: true, 
            replacement: "-"
        })
        newAuthor.slug = uniqueSlug
        await newAuthor.save()

    // updating user role to author
     const updatedUser = await UserModel.findByIdAndUpdate(
        user.id, 
        { 
            role: "author", 
            authorId: newAuthor._id, 
         }, 
         { new: true }
     )
     let userResult; // only assign value if user profile is registered as author

     if(updatedUser) { 
        userResult = formatUserProfile(updatedUser)
     }
     res.json({ 
        message: "Thanks for registering as an author", 
        user: userResult,
     })
 }

 export const updateAuthor: RequestAuthorHandler = async (req, res) => { 
    const { body, user } = req 

    await AuthorModel.findByIdAndUpdate(  
        user.authorId,  
        { 
            name: body.name, 
            about: body.about, 
            socialLinks: body.socialLinks,
        }
    )
    res.json({ message: "Your details updated successfully." })
 }

 export const getAuthorDetails: RequestHandler = async (req, res) => { 
    // destructure id from params 
    const { id } = req.params 

    const author = await AuthorModel.findById(id).populate<{books: BookDoc[]}>( 
        "books"
    )
    // check if author is there 
    if(!author) 
        return sendErrorResponse({ 
         res, 
         message: "Author is not found!", 
         status: 404, 
    })
    // send back json object of author details and populated book details
    res.json({ 
        id: author._id,
        name: author.name,
        about: author.about,
        socialLinks: author.socialLinks,
        books: author.books?.map((book) => {
          return {
            id: book._id?.toString(),
            title: book.title,
            slug: book.slug,
            genre: book.genre,
            price: {
              mrp: (book.price.mrp / 100).toFixed(2),
              sale: (book.price.sale / 100).toFixed(2),
            },
            cover: book.cover?.url,
            rating: book.averageRating?.toFixed(1),
          };
        }),
    })
 }

 export const getBooks: RequestHandler = async (req, res) => { 
    const { authorId } = req.params  

    const author = await AuthorModel.findById(authorId).populate<{ 
        books: BookDoc[]
     }>("books")

    if(!author)  
        return sendErrorResponse({ 
         message: "Unauthorized request", 
         res, 
         status: 403
    })

    res.json({ 
        books: author.books.map((book) => ({ 
            id: book._id?.toString(), 
            title: book.title, 
            slug: book.slug, 
            status: book.status, 
        }))
    })
 }