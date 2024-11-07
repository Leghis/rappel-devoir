import { NextResponse } from 'next/server';
import clientPromise from "@/app/utils/mongodb";
import nodemailer from 'nodemailer';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { marked } from "marked";  // Importer marked pour le rendu Markdown

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Fonction pour créer le template d'email avec le Markdown converti
const createEmailTemplate = (homeworkData: any) => {
    const dueDate = format(new Date(homeworkData.dueDate), 'dd MMMM yyyy', { locale: fr });
    const descriptionHtml = marked(homeworkData.description || "");

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nouveau Devoir</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <!-- Table principale -->
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table role="presentation" style="max-width: 600px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <!-- En-tête -->
                            <tr>
                                <td style="padding: 30px; background-color: #6366f1; border-radius: 8px 8px 0 0;">
                                    <h1 style="color: white; font-size: 24px; text-align: center;">
                                        Nouveau Devoir Ajouté
                                    </h1>
                                </td>
                            </tr>
                            <!-- Contenu principal -->
                            <tr>
                                <td style="padding: 30px;">
                                    <h2 style="color: #4f46e5; font-size: 20px;">
                                        ${homeworkData.title}
                                    </h2>
                                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                        <h3 style="color: #374151; font-size: 16px;">Description du devoir :</h3>
                                        <div style="color: #4b5563;">${descriptionHtml}</div>
                                    </div>
                                    <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                                        <tr>
                                            <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px;">
                                                <p style="color: #92400e; font-weight: bold;">
                                                    📅 Date limite : ${dueDate}
                                                </p>
                                                ${homeworkData.timeRemaining ? `
                                                <p style="color: #92400e;">
                                                    ⏰ Temps restant : ${homeworkData.timeRemaining}
                                                </p>` : ''}
                                            </td>
                                        </tr>
                                    </table>
                                    <!-- Conseils ou remarques -->
                                    <div style="background-color: #e0e7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                        <p style="color: #3730a3;">
                                            💡 Rappel : N'oubliez pas de :
                                            <ul>
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
                                    <p style="color: #6b7280; text-align: center;">
                                        Cet email a été envoyé automatiquement par le système de suivi des devoirs.
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

// Fonction pour envoyer les emails
const sendEmails = async (subscribers: any[], homeworkData: any) => {
    const emailUser = process.env.EMAIL_USER;
    if (!emailUser) {
        throw new Error("L'email de l'expéditeur (EMAIL_USER) n'est pas défini dans les variables d'environnement.");
    }

    const emailPromises = subscribers.map(subscriber => {
        const mailOptions = {
            from: `Suivi des Devoirs <${emailUser}>`, // Format compatible pour nodemailer
            to: subscriber.email,
            subject: `📚 Rappel de devoir : ${homeworkData.title}`,
            html: createEmailTemplate(homeworkData)
        };
        return transporter.sendMail(mailOptions);
    });

    return Promise.all(emailPromises);
};


// Endpoint pour envoyer les rappels
export async function POST(request: Request) {
    try {
        const { homework } = await request.json();
        const client = await clientPromise;
        const db = client.db("homework-tracker");

        // Récupération des abonnés pour envoyer le rappel
        const subscribers = await db.collection("subscribers").find({}).toArray();

        // Envoi des emails
        await sendEmails(subscribers, homework);

        return NextResponse.json({
            success: true,
            notificationsSent: subscribers.length
        });
    } catch (error) {
        console.error("Erreur lors de l'envoi des rappels:", error);
        return NextResponse.json({
            success: false,
            error: "Échec de l'envoi des rappels"
        }, { status: 500 });
    }
}
