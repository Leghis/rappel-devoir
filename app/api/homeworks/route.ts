import { NextResponse } from 'next/server'
import clientPromise from "@/app/utils/mongodb";
import emailjs from "@emailjs/browser";
import {format} from "date-fns";
import {fr} from "date-fns/locale";

export async function GET() {
    try {
        const client = await clientPromise
        const db = client.db("homework-tracker")
        const homeworks = await db.collection("homeworks").find({}).toArray()
        return NextResponse.json(homeworks)
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to fetch homeworks" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const client = await clientPromise
        const db = client.db("homework-tracker")

        // Créer le devoir
        const result = await db.collection("homeworks").insertOne({
            ...body,
            createdAt: new Date(),
            details: [],
        })

        // Récupérer tous les abonnés
        const subscribers = await db.collection("subscribers").find({}).toArray()

        // Envoyer les notifications immédiates
        const emailPromises = subscribers.map(subscriber => {
            // Créer un objet FormData pour simuler un formulaire
            const formData = {
                to_email: subscriber.email,
                homework_title: body.title,
                homework_description: body.description,
                due_date: format(new Date(body.dueDate), 'dd MMMM yyyy', { locale: fr }),
                notification_type: 'nouveau_devoir'
            }

            return emailjs
                .send(
                    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
                    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
                    formData,
                    process.env.NEXT_PUBLIC_EMAILJS_USER_ID
                )
                .then((result) => {
                    console.log('Notification envoyée avec succès à', subscriber.email, result.text)
                })
                .catch((error) => {
                    console.error('Échec de l\'envoi de la notification à', subscriber.email, error.text)
                })
        })

        // Attendre que tous les emails soient envoyés
        await Promise.all(emailPromises)

        return NextResponse.json({
            success: true,
            homework: result,
            notificationsSent: subscribers.length
        })
    } catch (error) {
        console.error("Database error:", error)
        return NextResponse.json({
            error: "Failed to create homework or send notifications"
        }, { status: 500 })
    }
}