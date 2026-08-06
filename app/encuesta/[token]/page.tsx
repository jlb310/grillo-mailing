"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

interface Question {
  id: string;
  text: string;
  type: string;
  order: number;
}

interface SurveyData {
  survey: { title: string; questions: Question[] };
  contact: { name: string };
}

export default function EncuestaPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error" | "already">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/respuestas/${token}`)
      .then(async (res) => {
        if (res.status === 410) { setStatus("already"); return; }
        if (!res.ok) { setStatus("error"); return; }
        const json = await res.json();
        setData(json);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answersArr = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    const res = await fetch(`/api/respuestas/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersArr }),
    });
    if (res.ok) setStatus("done");
    else setErrorMsg("Error al enviar. Intente de nuevo.");
  }

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando encuesta...</p></div>;

  if (status === "already") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full text-center">
        <CardContent className="py-12">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold">Encuesta ya completada</h2>
          <p className="text-gray-500 mt-2">Ya respondió esta encuesta anteriormente.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (status === "error") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full text-center">
        <CardContent className="py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold">Enlace inválido</h2>
          <p className="text-gray-500 mt-2">Este enlace no es válido o ha expirado.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (status === "done") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full text-center">
        <CardContent className="py-12">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold">¡Gracias por sus respuestas!</h2>
          <p className="text-gray-500 mt-2">Recibirá su diploma de participación por email en los próximos minutos.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{data.survey.title}</h1>
          <p className="text-gray-500 mt-2">Hola, {data.contact.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {data.survey.questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <p className="font-medium mb-3">{q.text}</p>
                {q.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                        className={`w-10 h-10 rounded-full border-2 font-semibold transition-colors ${answers[q.id] === String(n) ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 hover:border-blue-300"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "yesno" && (
                  <div className="flex gap-3">
                    {["Sí", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`px-6 py-2 rounded-lg border-2 font-medium transition-colors ${answers[q.id] === opt ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 hover:border-blue-300"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "text" && (
                  <Textarea
                    placeholder="Su respuesta..."
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    className="resize-none"
                  />
                )}
              </CardContent>
            </Card>
          ))}
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3">
            Enviar respuestas
          </Button>
        </form>
      </div>
    </div>
  );
}
