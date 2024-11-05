import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export function HomeworkCard({ homework, onUnsubscribe }) {
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
            <p className="text-gray-600 flex-grow">{homework.description}</p>

            <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => onUnsubscribe(homework._id)}
            >
                Se désabonner de ce devoir
            </Button>
        </Card>
    )
}