import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from "@/app/utils/mongodb";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const client = await clientPromise
        const db = client.db("homework-tracker")

        const result = await db.collection("subscribers").deleteOne({
            _id: new ObjectId(params.id)
        })

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Subscriber not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json(
            { error: "Failed to delete subscriber" },
            { status: 500 }
        )
    }
}