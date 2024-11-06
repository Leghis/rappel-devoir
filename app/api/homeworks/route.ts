import { NextResponse } from 'next/server'
import clientPromise from "@/app/utils/mongodb";
import nodemailer from 'nodemailer';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const createEmailTemplate = (homeworkData: any) => {
    const dueDate = format(new Date(homeworkData.dueDate), 'dd MMMM yyyy', { locale: fr });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nouveau Devoir</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table role="presentation" style="max-width: 600px; border-collapse: collapse; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <!-- En-tête -->
                            <tr>
                                <td style="padding: 30px; background-color: #6366f1; border-radius: 8px 8px 0 0;">
                                    <h1 style="margin: 0; color: white; font-size: 24px; text-align: center;">
                                        Nouveau Devoir Ajouté
                                    </h1>
                                </td>
                            </tr>

                            <!-- Contenu principal -->
                            <tr>
                                <td style="padding: 30px;">
                                    <h2 style="color: #4f46e5; margin-top: 0; margin-bottom: 20px; font-size: 20px;">
                                        ${homeworkData.title}
                                    </h2>
                                    
                                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                        <h3 style="color: #374151; margin-top: 0; margin-bottom: 10px; font-size: 16px;">
                                            Description du devoir :
                                        </h3>
                                        <p style="color: #4b5563; margin: 0; line-height: 1.6;">
                                            ${homeworkData.description}
                                        </p>
                                    </div>

                                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                        <tr>
                                            <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px;">
                                                <p style="margin: 0; color: #92400e; font-weight: bold;">
                                                    📅 Date limite : ${dueDate}
                                                </p>
                                                ${homeworkData.timeRemaining ? `
                                                <p style="margin: 5px 0 0 0; color: #92400e;">
                                                    ⏰ Temps restant : ${homeworkData.timeRemaining}
                                                </p>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Conseils ou remarques -->
                                    <div style="background-color: #e0e7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                        <p style="margin: 0; color: #3730a3; font-size: 14px;">
                                            💡 Rappel : N'oubliez pas de :
                                            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                                <li>Commencer tôt pour éviter le stress de dernière minute</li>
                                                <li>Vérifier les critères d'évaluation</li>
                                                <li>Poser des questions si nécessaire</li>
                                            </ul>
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Pied de page -->
                            <tr>
                                <td style="padding: 30px; background-color: #f3f4f6; border-radius: 0 0 8px 8px;">
                                    <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                                        Cet email a été envoyé automatiquement par le système de suivi des devoirs.
                                        <br>
                                        Pour plus d'informations, consultez votre espace de travail.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

const sendEmails = async (subscribers: any[], homeworkData: any) => {
    const emailPromises = subscribers.map(subscriber => {
        const mailOptions = {
            from: {
                name: "Suivi des Devoirs",
                address: process.env.EMAIL_USER!
            },
            to: subscriber.email,
            subject: `📚 Nouveau devoir : ${homeworkData.title}`,
            html: createEmailTemplate(homeworkData)
        };

        return transporter.sendMail(mailOptions);
    });

    return Promise.all(emailPromises);
};

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("homework-tracker");
        const homeworks = await db.collection("homeworks").find({}).toArray();
        return NextResponse.json(homeworks);
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ error: "Failed to fetch homeworks" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const client = await clientPromise;
        const db = client.db("homework-tracker");

        const result = await db.collection("homeworks").insertOne({
            ...body,
            createdAt: new Date(),
            details: [],
        });

        const subscribers = await db.collection("subscribers").find({}).toArray();

        try {
            await sendEmails(subscribers, body);

            return NextResponse.json({
                success: true,
                homework: result,
                notificationsSent: subscribers.length
            });
        } catch (emailError) {
            console.error("Erreur d'envoi des emails:", emailError);

            return NextResponse.json({
                success: true,
                homework: result,
                notificationsSent: 0,
                emailError: "Failed to send notifications"
            });
        }
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({
            error: "Failed to create homework"
        }, { status: 500 });
    }
}