import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Seeds the certificate batch for the "III Jornada Vanguardia en Cuidados
// Paliativos" (23 jun 2026) directly from the event's attendee list. The admin
// upload UI wasn't usable for this list (the source sheet has banner rows and an
// unlabeled "horas" column that the generic CSV parser can't map), so the rows
// are embedded here and created server-side on deploy — same idempotent
// startup-script pattern as schedule-simposio-sends / apply-jornada-logos.
//
// The batch is created as DRAFT (never auto-sent): it shows up in
// /admin/certificados so the send can be reviewed and triggered from the
// platform ("Generar y enviar"). Idempotent: skipped if a batch with the same
// name already exists, so it is safe to run on every deploy.
//
// Role casing from the source sheet was normalized to title case
// (CONFERENCISTA -> Conferencista, etc.) for a clean render. Note the list
// contains g.schorwer@outlook.com twice (two distinct recipients sharing an
// inbox) — both certificates are intentionally kept.
const BATCH_NAME = "III Jornada Vanguardia en Cuidados Paliativos";

const ROWS: { recipientName: string; recipientEmail: string; role: string; horas: number; activityTitle: string; activityDate: string }[] = [
  { recipientName: "VERÓNICA GIL FAIVOVICH", recipientEmail: "vgil@alemana.cl", role: "Coordinadora Académica", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ROSA CORDERO", recipientEmail: "rcordero@alemana.cl", role: "Coordinadora Académica", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "FLORENCIA INFANTE", recipientEmail: "floinfan@ucm.es", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ANA MARÍA SANTELICES BECERRA", recipientEmail: "g.schorwer@outlook.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "PABLO OLMOS DE AGUILERA", recipientEmail: "pablo@olmosdeaguilera.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CRISTIÁN MEZA", recipientEmail: "cimeza@uc.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ROMANO PELEGRINO", recipientEmail: "jromanod@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "KARLA BRUNING", recipientEmail: "karlabruning@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CAROLL LÓPEZ SIERRA", recipientEmail: "carollzsierra3@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA URIARTE CAMPOS", recipientEmail: "mjuriarte@miuandes.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MELISSA VALENCIA", recipientEmail: "mely.valencia@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JUAN PABLO CHIQUITO", recipientEmail: "jpchiquitoh@yahoo.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ANA DEMARCHI", recipientEmail: "anitademarchi@hotmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CATALINA IBARRA ORTIZ", recipientEmail: "catalina.ibarra.o@usach.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA LUISA PAÉZ CONCHA", recipientEmail: "malupaez@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JESSICA TUAREZ PALMA", recipientEmail: "dra.jessicatuarezpalma@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ASTRID DJAMILA HEITMANN VELASCO", recipientEmail: "dra.heitmann@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "AMALIA HONEYMAN ALVARADO", recipientEmail: "amaliah72826@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CECILIA GONZÁLEZ", recipientEmail: "cecigleza@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "OLGA BENAVIDES CANALES", recipientEmail: "emelec32@hotmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "INGRID DANKE", recipientEmail: "ingriddanke@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "NATALIA RETAMAL ESPINOSA", recipientEmail: "na.retamal@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "SILVANA PULGAR", recipientEmail: "dra.silvanapulgar@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA RENTERIA", recipientEmail: "coni.renteria@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JUAN JOSÉ PÉREZ CORRALES", recipientEmail: "juanjperez1993@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DIEGO MUÑOZ FLORES", recipientEmail: "diego.mf29@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "GISSELA CAMINO GARRIDO", recipientEmail: "drgisselacamino@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "SEBASTIÁN PERALTA", recipientEmail: "sebastianperaltar@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ANDREA VARGAS", recipientEmail: "andreavargas6@yahoo.es", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "XIMENA SAIZ", recipientEmail: "draxsaiz17@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JAVIERA ADRIAZOLA SALAZAR", recipientEmail: "javi.adriazola.salazar@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VALESKA VALESKA SOTO", recipientEmail: "valeskasotocornejo@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CRISTIÁN LARRAIN", recipientEmail: "doctorcito@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "RAFAEL LOGREIRA RODRÍGUEZ", recipientEmail: "rafael.logreira@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA EUGENIA MARTÍNEZ TORO", recipientEmail: "martineztoroeugenia@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ALDA VARGAS VELIZ", recipientEmail: "aldavargasveliz@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VALENTINA ZAMORA", recipientEmail: "v.zamora.lisperguier@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "KAREN FARÍAS DURÁN", recipientEmail: "karen.farias@redsalud.gob.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "RAFAEL GÁLVEZ", recipientEmail: "ralegagu@hotmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA LABBÉ ARAYA", recipientEmail: "c.labbearaya@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARISOL AHUMADA", recipientEmail: "maryaahumada@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DIEGO CRUZ", recipientEmail: "diegocruzoyarce@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CECILIA COVARRUBIAS", recipientEmail: "ceci.covarrubias@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA GASTO WORKMAN", recipientEmail: "cgasto@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "FRANCISCA MENA", recipientEmail: "fmenaclaussen@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA FERNANDA MENESES FREDES", recipientEmail: "mfernanda.meneses.fredes@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MOYRA LÓPEZ RAMÍREZ", recipientEmail: "moyra.lopez@incancer.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ALEJANDRA ACEVEDO", recipientEmail: "alejandra.acevedo@oncocare.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VILMA OLAVE", recipientEmail: "vilmaolave@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DANIELA ASTABURUAGA", recipientEmail: "dastaburuaga@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "RODRIGO CEPEDA", recipientEmail: "rodro.medi@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "SANDRA VERÓNICA ACEVEDO AHUMADA", recipientEmail: "sacevedo@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "KELY BARAHONA", recipientEmail: "obarahona@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CAROLINA BELTRÁN VIDELA", recipientEmail: "abeltran@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "FERNANDA CARRASCO", recipientEmail: "fcarrasco@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA ELIANA EBERHARD", recipientEmail: "meberhard@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "GUILLERMO SEBASTIÁN LORCA CHACÓN", recipientEmail: "glorca@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA TERESA LOYOLA VALENCIA", recipientEmail: "mloyolav@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CAMILO MENESES CORTÉS", recipientEmail: "camilo.amc@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CELIA QUEVEDO", recipientEmail: "cequevedo@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ALEJANDRA RODRÍGUEZ", recipientEmail: "arodriguezu@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ULDA ROCHA", recipientEmail: "dra.uldarocha@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VALENTINA CABRERA", recipientEmail: "val.cabrera.rios@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA ANGÉLICA BECERRA", recipientEmail: "mange.601@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA CAROLINA ROBLEDO OSSES", recipientEmail: "mrobledo@uc.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "BEATRIZ ZAVALA PRATI", recipientEmail: "bzavalap@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VICTORIANA ACEVEDO GUZMÁN", recipientEmail: "vdaceved@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DAYANE KOPFER JENSEN", recipientEmail: "dayane.kopfer@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "STEPHANIE HASBUN VELASCO", recipientEmail: "shelasco@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DIANA PAREJA RAMÍREZ", recipientEmail: "jupiter.jazz82@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ROCIO SALAS RAMÍREZ", recipientEmail: "rociobelen.salas@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DIEGO MUÑOZ VENEGAS", recipientEmail: "diego.vie20@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "NATALIA OJEDA MARÍN", recipientEmail: "natitaojeda@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "PAOLA SAN MARTÍN CERDA", recipientEmail: "paola.sanmartin@falp.org", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CLAUDIA NEIRA MIRANDA", recipientEmail: "claudia.neira@oncovida.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA JOSÉ ERRÁZURIZ KOPPMANN", recipientEmail: "majoerrazuriz@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DORA CATALDO", recipientEmail: "dra.doracataldo94@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "PAULA SÁEZ", recipientEmail: "paulasaez.p@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DANIELA PAZ LÓPEZ CARVAJAL", recipientEmail: "daniela.lopezcarvajal@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA MICOLICH", recipientEmail: "conimi@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JONATHAN TRONCOSO", recipientEmail: "j.troncoso.rivera@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "GERARDO SCHORWER ALARCÓN", recipientEmail: "g.schorwer@outlook.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA LUISA FILGUEIRA ARIAS", recipientEmail: "mlfilgueira@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VIOLETA LÓPEZ", recipientEmail: "violetalopezm@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JESSICA FIERRO", recipientEmail: "fierro1106@yahoo.es", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ANGÉLICA PEREIRA", recipientEmail: "angelica.eli.pereira.u@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MÓNICA REYES", recipientEmail: "eliang197636@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA BESSER", recipientEmail: "constanza.besserp@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "FABIOLA LAZCANO", recipientEmail: "fabiolalazcano@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "GABRIELA PARADA", recipientEmail: "gp.paradav@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "LYNN JEANNERET MURDOCH", recipientEmail: "lynnjeanneret@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "PÍA LILLO", recipientEmail: "pialv.7@hotmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MERCEDES ALESSANDRI", recipientEmail: "alessandrimercedes@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "BERNARDITA ASPILLAGA VALDÉS", recipientEmail: "baspillaga@debrachile.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ROSARIO DELL ORO", recipientEmail: "rdelloro@debrachile.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CATALINA HUBNER", recipientEmail: "chubner@debrachile.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA LARRAÍN PEREIRA", recipientEmail: "clarrain.enf@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JESSICA YAÑEZ HIDALGO", recipientEmail: "jessica.yanezh@yahoo.es", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CARLA ALFARO NAVARRO", recipientEmail: "carla.alfaro@falp.org", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "NATALY SILVA RAMOS", recipientEmail: "nataly.silva@falp.org", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ROXANNA ZOLEZZI", recipientEmail: "roxzole@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "PAULINA MATUS", recipientEmail: "paulinamatus@uchile.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "VANESSA ANDREA SALINAS SUBIABRE", recipientEmail: "vasalinas@miuandes.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA VERGARA KINDERMAN", recipientEmail: "cvergarakinderman@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ERIC POLANCO", recipientEmail: "egpolanco@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "SUN-LI LOO", recipientEmail: "sunliloomonardez@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ELIZABETH CALDERÓN", recipientEmail: "e.calderon.barrera@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JOCELYN SEPÚLVEDA HUENUQUEO", recipientEmail: "jocely.sepulveda@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CAMILA MÉNDEZ", recipientEmail: "cjm.mayolafquen@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA ALEJANDRA PAJARITO", recipientEmail: "alee.pajarito@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "HECTOR DUQUE", recipientEmail: "hduque@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA CORTÉS", recipientEmail: "cocortes@alemana.cl", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "NICOLE CAREY", recipientEmail: "nicolecareyp@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CARMEN PAZ ASTETE", recipientEmail: "cpastete@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ROMINA BELÉN IRARRÁZABAL BURGOS", recipientEmail: "rirarrazabalb@yahoo.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA DE LOS ÁNGELES VALDIVIESO", recipientEmail: "maryval44@gmail.com", role: "Asistente", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JUAN PABLO BECA", recipientEmail: "jpbeca23@gmail.com", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JAIME DE LOS HOYOS", recipientEmail: "jdeloshoyos@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "PATRICIA LALLANA", recipientEmail: "patricialallana@gmail.com", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "BERND OBERPAUR", recipientEmail: "boberpaur@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CECILIA PLAZA", recipientEmail: "cplazab@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "DANIELA PORTILLA", recipientEmail: "dportilla@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MATHIEU REVECO", recipientEmail: "mrevecol@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "EMILIO ROESSLER", recipientEmail: "eloroessler@yahoo.com", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MICHELLE SABA", recipientEmail: "msaba@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CRISTÓBAL SÁNCHEZ", recipientEmail: "crsanchezc@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA JESÚS SOLIS", recipientEmail: "msolisf@alemana.cl", role: "Conferencista", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "MARÍA XIMENA BELTRÁN", recipientEmail: "maria.beltran@fsfb.org.co", role: "Conferencista Internacional", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JUAN GUILLERMO SANTACRUZ ESCUDERO", recipientEmail: "juan.santacruz@fsfb.org.co", role: "Conferencista Internacional", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "JAVIER QUILODRÁN", recipientEmail: "jquilodran@alemana.cl", role: "Director", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ANDREA GUERRERO", recipientEmail: "aguerreroc@alemana.cl", role: "Directora", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "ANDREA MUÑOZ ABARCA", recipientEmail: "anmunoza@alemana.cl", role: "Moderadora", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
  { recipientName: "CONSTANZA MARGARITA ZÚÑIGA CORREA", recipientEmail: "czunigac@alemana.cl", role: "Moderadora", horas: 13, activityTitle: "III JORNADA VANGUARDIA EN CUIDADOS PALIATIVOS", activityDate: "23 de junio de 2026" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.certificateBatch.findFirst({ where: { name: BATCH_NAME } });
  if (existing) {
    console.log(`[seed-ccpp-certificates] Batch "${BATCH_NAME}" already exists (${existing.id}). Skipping.`);
    return;
  }

  const batch = await prisma.certificateBatch.create({
    data: {
      name: BATCH_NAME,
      status: "DRAFT",
      certificates: {
        create: ROWS.map((r) => ({
          recipientName: r.recipientName,
          recipientEmail: r.recipientEmail,
          role: r.role,
          horas: r.horas,
          activityTitle: r.activityTitle,
          activityDate: r.activityDate,
          status: "PENDING" as const,
        })),
      },
    },
  });

  console.log(`[seed-ccpp-certificates] Created DRAFT batch "${BATCH_NAME}" (${batch.id}) with ${ROWS.length} certificates.`);
}

main()
  .catch((e) => { console.error("[seed-ccpp-certificates]", e); process.exit(0); /* non-fatal */ })
  .finally(() => prisma.$disconnect());
