import BookModel, { BookDoc } from "@/models/book";
import OrderModel from "@/models/order";
import UserModel from "@/models/user";
import stripe from "@/stripe-local";
import { StripeCustomer } from "@/types/stripe";
import { sendErrorResponse } from "@/utils/helper";
import { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import { boolean } from "zod";

export const getOrders: RequestHandler = async (req, res) => { 
    const orders = await OrderModel.find({ 
        userId: req.user.id
    }) // access order by userId & populate user orderItems with order
        .populate<{ 
            orderItems: { 
                id: BookDoc 
                price: number 
                qty: number 
                totalPrice: number 
            }[]
        }>("orderItems.id")
        .sort("-createdAt")

        res.json({ 
            orders: orders.map((item) => { 
                return { 
                    id: item._id, 
                    stripeCustomerId: item.stripeCustomerId, 
                    paymentId: item.paymentId, 
                    totalAmount: item.totalAmount ? (item.totalAmount / 100).toFixed(2)
                    : "0", 
                    paymentStatus: item.paymentStatus, 
                    date: item.createdAt, 
                    orderItem: item.orderItems.map( 
                        ({ id: book, price, qty, totalPrice }) => { 
                            return { 
                                id: book._id, 
                                title: book.title, 
                                slug: book.slug, 
                                cover: book.cover?.url, 
                                qty, 
                                price: (price / 100).toFixed(2), 
                                totalPrice: (totalPrice / 100).toFixed(2),
                            }
                        }
                    )
                }
            })
        })
}

export const getOrderStatus: RequestHandler = async (req, res) => { 
    // get bookId from params to find user order 
    const { bookId } = req.params 
    
    let status = false // initital status will be false, and toggle to true based of validity if user has books

    // check if the bookId has a valid ObjectId 
    if(isValidObjectId(bookId)) return res.json({ status })
        
    const user = await UserModel.findOne({ _id: req.user.id, books: bookId }) 
    if(user) status = true 

    res.json({ status })
}

export const getOrderSuccessStatus: RequestHandler = async (req, res) => { 
    // check if sessionId is valid, 
    //if so make call to stripe checkout session by using current sessionId
    const { sessionId } = req.body 

    if(typeof sessionId !== "string") 
        return sendErrorResponse({ 
         res, 
         message: "Invalid sessionId", 
         status: 400,
    }) 

    const session = await stripe.checkout.sessions.retrieve(sessionId) 
    const customerId = session.customer // current customer represents session customerId 

    let customer: StripeCustomer

    // if customerId is a valid string save that customer inside of stripe session 
    if(typeof customer === "string") { 
        customer = (await stripe.customers.retrieve( 
            customerId 
        )) as unknown as StripeCustomer

        // after configuring stripe customer 
        // destructure orderId from customer metadata property to get access to OrderItems
        const { orderId } = customer.metadata 
        const order = await OrderModel.findById(orderId).populate<{ 
            orderItems: { 
                id: BookDoc 
                price: number 
                qty: number 
                totalPrice: number 
            }[]
        }>("orderItem.id")

        if(!order) 
            return sendErrorResponse({ 
           message: "Order not found!", 
           status: 404, 
           res
        })
        // data contains orderitems 
        const data = order.orderItems.map( 
            ({ id:book , price, totalPrice, qty }) => { 
                return { 
                    id: book._id, 
                    title: book.title, 
                    slug: book.slug, 
                    cover: book.cover?.url,
                    price: (price / 100).toFixed(2), 
                    totalPrice: (totalPrice / 100).toFixed(2), 
                    qty,
                }
            }
        )
        // return json object containing orders and total amount 
        return res.json({ 
            orders: data, 
            totalAmount: order.totalAmount ? (order.totalAmount / 100).toFixed(2)
            : "0",
        })
    }

    sendErrorResponse({ 
        message: "Something went wrong order not found!", 
        status: 500, 
        res,
    })
}