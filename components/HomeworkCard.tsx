import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

// @ts-ignore
export function HomeworkCard({ homework, onUnsubscribe }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSendReminder = async () => {
        setLoading(true);
        setMessage("");  // Réinitialiser le message

        try {
            const response = await fetch('/api/homeworks/remind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ homework })
            });

            if (response.ok) {
                const result = await response.json();
                setMessage(`Rappel envoyé à ${result.notificationsSent} abonnés.`);
            } else {
                setMessage("Erreur lors de l'envoi du rappel.");
            }
        } catch (error) {
            console.error("Erreur d'envoi:", error);
            setMessage("Erreur lors de l'envoi du rappel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <span className={`text-sm px-2 py-1 rounded ${
                    homework.priority === 'high' ? 'bg-red-100 text-red-800' :
                        homework.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                }`}>
                    {homework.priority}
                </span>
                <span className="text-sm text-gray-500">
                    {format(new Date(homework.dueDate), 'dd MMMM yyyy', { locale: fr })}
                </span>
            </div>

            <h3 className="text-xl font-semibold">{homework.title}</h3>
            <p className="text-sm text-gray-500 mb-2">{homework.subject}</p>

            <div className="text-gray-600 flex-grow prose prose-sm prose-blue">
                <ReactMarkdown>{homework.description}</ReactMarkdown>
            </div>

            {/* Bouton pour envoyer un rappel */}
            <div className="mt-4">
                <Button onClick={handleSendReminder} disabled={loading} className="w-full">
                    {loading ? "Envoi en cours..." : "Envoyer un rappel"}
                </Button>
                {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
            </div>
        </Card>
    );
}
