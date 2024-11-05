'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import emailjs from '@emailjs/browser'
import { HomeworkCard } from '@/components/HomeworkCard'

interface Homework {
  _id: string
  title: string
  subject: string
  description: string
  dueDate: Date
  priority: 'low' | 'medium' | 'high'
  details: string[]
}

interface Subscriber {
  _id: string
  email: string
  unsubscribedHomeworks: string[]
}

export default function Page() {
  const { toast } = useToast()
  const [showNewHomeworkDialog, setShowNewHomeworkDialog] = useState(false)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(false)
  const [newHomework, setNewHomework] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: new Date(),
    priority: 'medium' as const
  })
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    fetchHomeworks()
    fetchSubscribers()
  }, [])

  const fetchHomeworks = async () => {
    try {
      const response = await fetch('/api/homeworks')
      if (!response.ok) throw new Error('Erreur lors de la récupération des devoirs')
      const data = await response.json()
      setHomeworks(data)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les devoirs",
        variant: "destructive",
      })
    }
  }

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/subscribers')
      if (!response.ok) throw new Error('Erreur lors de la récupération des abonnés')
      const data = await response.json()
      setSubscribers(data)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les abonnés",
        variant: "destructive",
      })
    }
  }

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await fetch('/api/homeworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHomework)
      })

      if (!response.ok) throw new Error('Erreur lors de l\'ajout du devoir')

      // Notifier tous les abonnés
      for (const subscriber of subscribers) {
        try {
          await emailjs.send(
              process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
              process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
              {
                to_email: subscriber.email,
                homework_title: newHomework.title,
                homework_description: newHomework.description,
                due_date: format(newHomework.dueDate, 'dd MMMM yyyy', { locale: fr }),
                reminder: false
              },
              process.env.NEXT_PUBLIC_EMAILJS_USER_ID
          )
        } catch (error) {
          console.error('Erreur d\'envoi d\'email:', error)
        }
      }

      await fetchHomeworks()
      setShowNewHomeworkDialog(false)
      setNewHomework({
        title: '',
        subject: '',
        description: '',
        dueDate: new Date(),
        priority: 'medium'
      })

      toast({
        title: "Succès",
        description: "Le devoir a été ajouté",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le devoir",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      })

      if (!response.ok) throw new Error('Erreur lors de l\'abonnement')

      await fetchSubscribers()
      setNewEmail('')

      toast({
        title: "Succès",
        description: "Vous êtes maintenant abonné aux notifications",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de s'abonner",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribeFromHomework = async (homeworkId: string, subscriberId: string) => {
    try {
      const response = await fetch(`/api/subscribers/${subscriberId}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeworkId })
      })

      if (!response.ok) throw new Error('Erreur lors du désabonnement')

      await fetchSubscribers()

      toast({
        title: "Succès",
        description: "Vous êtes désabonné de ce devoir",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se désabonner",
        variant: "destructive",
      })
    }
  }

  const handleUnsubscribeAll = async (subscriberId: string) => {
    try {
      const response = await fetch(`/api/subscribers/${subscriberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erreur lors du désabonnement')

      await fetchSubscribers()

      toast({
        title: "Succès",
        description: "Vous êtes désabonné de tous les devoirs",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se désabonner",
        variant: "destructive",
      })
    }
  }

  return (
      <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500 p-8">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
        >
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            Gestionnaire de Devoirs
          </h1>

          <Tabs defaultValue="homeworks" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="homeworks">Devoirs</TabsTrigger>
              <TabsTrigger value="subscribers">Abonnés</TabsTrigger>
            </TabsList>

            <TabsContent value="homeworks">
              <div className="mb-6 flex justify-end">
                <Dialog open={showNewHomeworkDialog} onOpenChange={setShowNewHomeworkDialog}>
                  <DialogTrigger asChild>
                    <Button size="lg">
                      <span className="mr-2">+</span>
                      Nouveau Devoir
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Ajouter un nouveau devoir</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddHomework} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Matière</label>
                        <Input
                            required
                            value={newHomework.subject}
                            onChange={(e) => setNewHomework({...newHomework, subject: e.target.value})}
                            placeholder="Ex: Mathématiques"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Titre</label>
                        <Input
                            required
                            value={newHomework.title}
                            onChange={(e) => setNewHomework({...newHomework, title: e.target.value})}
                            placeholder="Ex: Exercices sur les équations"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea
                            required
                            value={newHomework.description}
                            onChange={(e) => setNewHomework({...newHomework, description: e.target.value})}
                            placeholder="Détails du devoir..."
                            className="min-h-[100px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Date limite</label>
                        <Calendar
                            mode="single"
                            selected={newHomework.dueDate}
                            onSelect={(date) => date && setNewHomework({...newHomework, dueDate: date})}
                            className="rounded-md border"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Priorité</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={newHomework.priority}
                            onChange={(e) => setNewHomework({...newHomework, priority: e.target.value as 'low' | 'medium' | 'high'})}
                        >
                          <option value="low">Basse</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                        </select>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Ajout en cours...' : 'Ajouter le devoir'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {homeworks.map((homework) => (
                      <motion.div
                          key={homework._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                      >
                        <HomeworkCard
                            homework={homework}
                            onUnsubscribe={(subscriberId) => handleUnsubscribeFromHomework(homework._id, subscriberId)}
                        />
                      </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="subscribers">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Gérer les abonnements</h2>
                <div className="space-y-4">
                  <form onSubmit={handleSubscribe} className="flex gap-4">
                    <Input
                        type="email"
                        required
                        placeholder="Votre email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={loading}>
                      {loading ? 'En cours...' : 'S\'abonner'}
                    </Button>
                  </form>

                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Liste des abonnés</h3>
                    <div className="space-y-2">
                      {subscribers.map((subscriber) => (
                          <div key={subscriber._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>{subscriber.email}</span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleUnsubscribeAll(subscriber._id)}
                            >
                              Se désabonner
                            </Button>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
  )
}