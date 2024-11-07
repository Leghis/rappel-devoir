// pages/api/scheduler.js
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clientPromise from "../utils/mongodb";

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const createReminderTemplate = (homework, timeRemaining) => {
    const dueDate = format(new Date(homework.dueDate), 'dd MMMM yyyy', { locale: fr });

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rappel de Devoir</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="max-width: 600px; border-collapse: collapse; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- En-tête -->
              <tr>
                <td style="padding: 30px; background-color: #ef4444; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: white; font-size: 24px; text-align: center;">
                    ⏰ Rappel de Devoir
                  </h1>
                </td>
              </tr>

              <!-- Contenu principal -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #4f46e5; margin-top: 0; margin-bottom: 20px; font-size: 20px;">
                    ${homework.title}
                  </h2>
                  
                  <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 16px;">
                      ⚠️ Temps restant : ${timeRemaining}
                    </p>
                  </div>

                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #374151; margin-top: 0; margin-bottom: 10px; font-size: 16px;">
                      Description du devoir :
                    </h3>
                    <p style="color: #4b5563; margin: 0; line-height: 1.6;">
                      ${homework.description}
                    </p>
                  </div>

                  <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px;">
                        <p style="margin: 0; color: #92400e; font-weight: bold;">
                          📅 Date limite : ${dueDate}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color: #e0e7ff; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; color: #3730a3; font-size: 14px;">
                      💡 Actions recommandées :
                      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>Vérifiez votre avancement</li>
                        <li>Planifiez votre temps restant</li>
                        <li>Demandez de l'aide si nécessaire</li>
                      </ul>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Pied de page -->
              <tr>
                <td style="padding: 30px; background-color: #f3f4f6; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                    Ceci est un rappel automatique du système de suivi des devoirs.
                    <br>
                    Pour gérer vos notifications, consultez votre espace de travail.
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

const calculateTimeRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = Math.abs(due.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffDays > 1) {
        return `${diffDays} jours`;
    } else if (diffHours > 1) {
        return `${diffHours} heures`;
    } else {
        return "moins d'une heure";
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('homework-tracker');

        // Récupérer les devoirs actifs
        const homeworks = await db.collection('homeworks').find({
            dueDate: { $gt: new Date() },
        }).toArray();

        // Récupérer tous les abonnés
        const subscribers = await db.collection('subscribers').find({}).toArray();

        // Pour chaque devoir, envoyer un rappel aux abonnés
        for (const homework of homeworks) {
            const timeRemaining = calculateTimeRemaining(homework.dueDate);

            const emailPromises = subscribers.map((subscriber) => {
                // Vérifier si l'utilisateur n'est pas désabonné de ce devoir
                if (!subscriber.unsubscribedHomeworks?.includes(homework._id.toString())) {
                    const mailOptions = {
                        from: {
                            name: "Rappel de Devoirs",
                            address: process.env.EMAIL_USER
                        },
                        to: subscriber.email,
                        subject: `⚠️ Rappel : ${homework.title} - ${timeRemaining} restant`,
                        html: createReminderTemplate(homework, timeRemaining)
                    };

                    return transporter.sendMail(mailOptions)
                        .then(() => {
                            console.log('Rappel envoyé avec succès à', subscriber.email);
                        })
                        .catch((error) => {
                            console.error('Échec de l\'envoi du rappel à', subscriber.email, error);
                        });
                }
            });

            await Promise.all(emailPromises.filter(Boolean));
        }

        res.status(200).json({ message: 'Rappels envoyés avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi des rappels:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
}