// services/scheduler.ts
import { scheduleJob } from 'node-schedule'
import emailjs from '@emailjs/browser'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clientPromise from "@/app/utils/mongodb";

export const initializeScheduler = async () => {
    // Rappels toutes les 4 heures
    scheduleJob('0 */4 * * *', async () => {
        try {
            const client = await clientPromise
            const db = client.db("homework-tracker")

            // Récupérer les devoirs actifs
            const homeworks = await db.collection("homeworks").find({
                dueDate: { $gt: new Date() }
            }).toArray()

            // Récupérer tous les abonnés
            const subscribers = await db.collection("subscribers").find({}).toArray()

            // Pour chaque devoir, envoyer un rappel aux abonnés
            for (const homework of homeworks) {
                const emailPromises = subscribers.map(subscriber => {
                    // Vérifier si l'utilisateur n'est pas désabonné de ce devoir
                    if (!subscriber.unsubscribedHomeworks?.includes(homework._id.toString())) {
                        const formData = {
                            to_email: subscriber.email,
                            homework_title: homework.title,
                            homework_description: homework.description,
                            due_date: format(new Date(homework.dueDate), 'dd MMMM yyyy', { locale: fr }),
                            notification_type: 'rappel',
                            time_remaining: calculateTimeRemaining(homework.dueDate)
                        }

                        return emailjs
                            .send(
                                process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
                                process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
                                formData,
                                process.env.NEXT_PUBLIC_EMAILJS_USER_ID
                            )
                            .then((result) => {
                                console.log('Rappel envoyé avec succès à', subscriber.email, result.text)
                            })
                            .catch((error) => {
                                console.error('Échec de l\'envoi du rappel à', subscriber.email, error.text)
                            })
                    }
                })

                await Promise.all(emailPromises)
            }
        } catch (error) {
            console.error('Erreur lors de l\'envoi des rappels:', error)
        }
    })

    // Nettoyage quotidien des devoirs expirés
    scheduleJob('0 0 * * *', async () => {
        try {
            const client = await clientPromise
            const db = client.db("homework-tracker")

            const result = await db.collection("homeworks").deleteMany({
                dueDate: { $lt: new Date() }
            })

            console.log(`${result.deletedCount} devoirs expirés supprimés`)
        } catch (error) {
            console.error('Erreur lors du nettoyage des devoirs expirés:', error)
        }
    })
}

function calculateTimeRemaining(dueDate: Date): string {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = Math.abs(due.getTime() - now.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))

    if (diffDays > 1) {
        return `${diffDays} jours`
    } else if (diffHours > 1) {
        return `${diffHours} heures`
    } else {
        return "moins d'une heure"
    }
}