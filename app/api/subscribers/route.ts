import { NextResponse } from 'next/server'
import clientPromise from "@/app/utils/mongodb";

export async function GET() {
    try {
        const client = await clientPromise
        const db = client.db("homework-tracker")
        const subscribers = await db.collection("subscribers").find({}).toArray()
        return NextResponse.json(subscribers)
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const client = await clientPromise
        const db = client.db("homework-tracker")

        // Vérifier si l'email existe déjà
        const existingSubscriber = await db.collection("subscribers").findOne({
            email: body.email
        })

        if (existingSubscriber) {
            return NextResponse.json(
                { error: "Cet email est déjà abonné" },
                { status: 400 }
            )
        }

        const result = await db.collection("subscribers").insertOne({
            email: body.email,
            createdAt: new Date(),
            unsubscribedHomeworks: []
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to create subscriber" }, { status: 500 })
    }
}