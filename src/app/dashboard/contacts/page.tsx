"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Plus, Upload, Mail, XCircle, Phone, Building2 } from "lucide-react"
import Papa from "papaparse"

interface Contact {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  company: string | null
  unsubscribed: boolean
  lists?: { contactList: { name: string } }[]
  createdAt: string
}

interface ContactList {
  id: string
  name: string
  description: string | null
  _count?: { members: number }
}

export default function ContactsPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPERADMIN"

  const [contacts, setContacts] = useState<Contact[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [formData, setFormData] = useState({ email: "", firstName: "", lastName: "", phone: "", company: "" })

  useEffect(() => {
    fetchContacts()
    fetchLists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  const fetchContacts = async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/contacts?organizationId=${activeOrg}` : "/api/contacts"
    const res = await fetch(url)
    const data = await res.json()
    setContacts(data)
    setLoading(false)
  }

  const fetchLists = async () => {
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const url = activeOrg ? `/api/contact-lists?organizationId=${activeOrg}` : "/api/contact-lists"
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setLists(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const body = activeOrg ? JSON.stringify({ ...formData, organizationId: activeOrg }) : JSON.stringify(formData)
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    if (res.ok) {
      setOpen(false)
      setFormData({ email: "", firstName: "", lastName: "", phone: "", company: "" })
      fetchContacts()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data)
      }
    })
  }

  const handleImport = async () => {
    if (csvData.length === 0) return
    setImporting(true)
    
    const activeOrg = isSuperAdmin ? localStorage.getItem("grillo-active-org") : null
    const body = activeOrg
      ? JSON.stringify({ contacts: csvData, organizationId: activeOrg })
      : JSON.stringify({ contacts: csvData })
    
    const res = await fetch("/api/contacts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    
    if (res.ok) {
      setImportOpen(false)
      setCsvData([])
      fetchContacts()
    }
    setImporting(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-foreground">Contactos</h1>
          <p className="text-foreground-muted mt-2 text-lg">Gestiona tus contactos y listas de envío</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            {/* Base UI usa `render`, no `asChild` (que es API de Radix). Sin
                esto el Trigger renderiza su propio <button> alrededor del
                Button y queda un button dentro de otro → error de hidratación. */}
            <DialogTrigger
              render={
                <Button variant="outline" className="h-11 rounded-xl border-border text-foreground hover:bg-background-muted gap-2" />
              }
            >
              <Upload className="w-4 h-4" />
              Importar CSV
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-2xl border-border">
              <DialogHeader>
                <DialogTitle className="text-xl text-foreground">Importar contactos desde CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-border-strong transition-colors">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-foreground-subtle/60 mx-auto mb-3" />
                    <p className="text-sm text-foreground-muted font-medium">Haz clic para seleccionar un archivo CSV</p>
                    <p className="text-xs text-foreground-subtle mt-1">Formato: email, firstName, lastName, phone, company</p>
                  </label>
                </div>
                
                {csvData.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">{csvData.length} contactos encontrados</p>
                    <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-background-muted">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Nombre</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Apellido</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Teléfono</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Empresa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-2 text-foreground">{row.email || row.Email || row.EMAIL}</td>
                              <td className="px-3 py-2 text-foreground-muted">{row.firstName || row.first_name || row.FirstName || row.nombre}</td>
                              <td className="px-3 py-2 text-foreground-muted">{row.lastName || row.last_name || row.LastName || row.apellido}</td>
                              <td className="px-3 py-2 text-foreground-muted">{row.phone || row.Phone || row.telefono || ""}</td>
                              <td className="px-3 py-2 text-foreground-muted">{row.company || row.Company || row.empresa || ""}</td>
                            </tr>
                          ))}
                          {csvData.length > 10 && (
                            <tr><td colSpan={5} className="px-3 py-2 text-foreground-subtle text-center text-xs">... y {csvData.length - 10} más</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Button 
                      onClick={handleImport} 
                      className="w-full mt-4 h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium"
                      disabled={importing}
                    >
                      {importing ? "Importando..." : "Importar contactos"}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium gap-2" />
              }
            >
              <Plus className="w-4 h-4" />
              Agregar contacto
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-border">
              <DialogHeader>
                <DialogTitle className="text-xl text-foreground">Nuevo contacto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm text-foreground-muted">Nombre</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm text-foreground-muted">Apellido</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-foreground-muted">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm text-foreground-muted">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+56 9 1234 5678"
                      className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm text-foreground-muted">Empresa</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Acme Corp"
                      className="h-11 rounded-xl border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-medium">
                  Guardar contacto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="bg-background-muted rounded-xl h-10 p-1">
          <TabsTrigger value="contacts" className="rounded-lg text-sm data-[state=active]:bg-background-elev data-[state=active]:text-foreground data-[state=active]:shadow-sm">Contactos</TabsTrigger>
          <TabsTrigger value="lists" className="rounded-lg text-sm data-[state=active]:bg-background-elev data-[state=active]:text-foreground data-[state=active]:shadow-sm">Listas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className="mt-4">
          <div className="space-y-2">
            {contacts.map((contact) => (
              <Card key={contact.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-background-muted rounded-xl flex items-center justify-center">
                      <Mail className="w-4 h-4 text-foreground-subtle" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{contact.firstName} {contact.lastName}</p>
                      <p className="text-sm text-foreground-subtle">{contact.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {contact.phone && (
                          <span className="text-xs text-foreground-subtle flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {contact.phone}
                          </span>
                        )}
                        {contact.company && (
                          <span className="text-xs text-foreground-subtle flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {contact.company}
                          </span>
                        )}
                        {contact.lists?.map((l) => (
                          <Badge key={l.contactList.name} variant="outline" className="text-xs rounded-lg border-border text-foreground-subtle">
                            {l.contactList.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {contact.unsubscribed && (
                    <Badge variant="secondary" className="text-xs rounded-lg bg-danger/10 text-danger">
                      <XCircle className="w-3 h-3 mr-1" /> Dado de baja
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}

            {contacts.length === 0 && !loading && (
              <Card className="border border-border bg-background-elev rounded-2xl shadow-none">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-foreground-subtle/60" />
                  </div>
                  <p className="text-foreground-subtle font-medium">No hay contactos registrados</p>
                  <p className="text-sm text-foreground-subtle/60 mt-1">Importa un CSV o agrega contactos manualmente</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lists" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Card key={list.id} className="border border-border bg-background-elev rounded-2xl shadow-none hover:border-border-strong transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground">{list.name}</CardTitle>
                  <p className="text-sm text-foreground-subtle">{list.description}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-foreground-subtle/60">
                    {list._count?.members || 0} contactos
                  </p>
                </CardContent>
              </Card>
            ))}

            {lists.length === 0 && (
              <Card className="border border-border bg-background-elev rounded-2xl shadow-none col-span-full">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-background-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-foreground-subtle/60" />
                  </div>
                  <p className="text-foreground-subtle font-medium">No hay listas creadas</p>
                  <p className="text-sm text-foreground-subtle/60 mt-1">Las listas se crean automáticamente al importar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
