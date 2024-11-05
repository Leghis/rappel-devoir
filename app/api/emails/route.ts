import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const client = new MongoClient(uri)

export async function GET() {
    try {
        await client.connect()
        const db = client.db("homework-tracker")
        const emails = await db.collection("emails").find({}).toArray()
        return NextResponse.json(emails)
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    } finally {
        await client.close()
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        await client.connect()
        const db = client.db("homework-tracker")
        const result = await db.collection("emails").insertOne({
            address: body.address,
            createdAt: new Date()
        })
        return NextResponse.json(result)
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to create email" }, { status: 500 })
    } finally {
        await client.close()
    }
}