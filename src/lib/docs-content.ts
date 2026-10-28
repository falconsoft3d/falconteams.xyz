// Contenido de la documentación pública (/docs) en español e inglés.
// Cada sección tiene un id (ancla), un título y bloques: párrafos, listas o pasos.

import type { Locale } from "./i18n";

export type DocBlock =
  | { p: string }
  | { list: string[] }
  | { steps: string[] }
  | { note: string }
  | { h: string };

export type DocSection = { id: string; title: string; audience?: "admin" | "employee" | "all"; blocks: DocBlock[] };

export type DocsContent = {
  title: string;
  lead: string;
  toc: string;
  audience: Record<"admin" | "employee" | "all", string>;
  quickTitle: string;
  quick: { title: string; steps: string[] }[];
  sections: DocSection[];
};

const es: DocsContent = {
  title: "Documentación de FalconTeams",
  lead: "Guía completa para administradores y empleados: cómo poner en marcha la empresa, fichar, gestionar horas, proyectos, facturas y todo lo demás.",
  toc: "Contenido",
  audience: { admin: "Admin", employee: "Empleado", all: "Todos" },
  quickTitle: "Primeros pasos",
  quick: [
    {
      title: "Si eres administrador",
      steps: [
        "Entra en /login con tu cuenta de administrador.",
        "Crea tu empresa en Empresas: elige su dirección (por ejemplo «acme» → /acme/login).",
        "Da de alta a tus empleados en Empleados, con su empresa y su coste por hora o salario.",
        "Envía a cada empleado la dirección de login de su empresa y su contraseña inicial.",
      ],
    },
    {
      title: "Si eres empleado",
      steps: [
        "Entra en la dirección de tu empresa (por ejemplo /acme/login) con el email y la contraseña que te dieron.",
        "Pulsa «Registrar entrada» al empezar y «Registrar salida» al terminar.",
        "Revisa tu calendario: días trabajados, ausencias y horas del mes.",
        "Cambia tu contraseña en Mi perfil y, si facturas, completa tus datos de facturación.",
      ],
    },
  ],
  sections: [
    {
      id: "que-es",
      title: "Qué es FalconTeams",
      audience: "all",
      blocks: [
        { p: "FalconTeams es un sistema de control horario y gestión de equipos. Cada empresa tiene su propia dirección de acceso para sus empleados y un administrador que lo gestiona todo." },
        { p: "Hay dos perfiles:" },
        {
          list: [
            "Administrador: crea empresas y empleados, ve las horas y los costes de todos, las facturas, el mapa de fichajes, los buzones de correo y configura cada empresa.",
            "Empleado: ficha su entrada y salida, ve su calendario, reparte sus horas en proyectos, marca ausencias, cumple objetivos, usa el correo y el chat, y genera su factura mensual.",
          ],
        },
      ],
    },
    {
      id: "acceso",
      title: "Acceso e idioma",
      audience: "all",
      blocks: [
        { list: [
          "Administradores: /login.",
          "Empleados: la dirección de su empresa, por ejemplo /acme/login (también pueden usar /login: entrarán en su empresa).",
          "La sesión dura 7 días. Para salir, pulsa «Salir» arriba a la derecha.",
          "Arriba puedes cambiar el idioma (ES/EN) y el tema (claro, oscuro o el del sistema).",
          "El menú de la izquierda lleva a cada sección; en el móvil se abre con «☰ Menú».",
        ] },
      ],
    },
    {
      id: "empresas",
      title: "Empresas",
      audience: "admin",
      blocks: [
        { p: "En Empresas creas cada empresa con su nombre y su dirección (slug). La dirección de login de sus empleados será /<dirección>/login." },
        { list: [
          "Renombrar y activar/desactivar: una empresa desactivada no permite fichar ni entrar a sus empleados.",
          "Autocierre: si un empleado olvida fichar la salida, el fichaje se cierra solo tras las horas indicadas (8 por defecto), con la salida = entrada + límite, y queda marcado como «autocierre».",
          "Dashboard de la empresa (/<dirección>): empleados, quién está trabajando, horas y coste del mes, y calendario con las horas totales.",
        ] },
        { note: "El autocierre se aplica cada vez que la app consulta fichajes. Si quieres que se cierren aunque nadie entre, programa una llamada periódica a /api/cron/auto-close con la variable CRON_SECRET." },
      ],
    },
    {
      id: "empleados",
      title: "Empleados",
      audience: "admin",
      blocks: [
        { p: "En Empleados das de alta a cada persona con su nombre, email, contraseña inicial (mínimo 8 caracteres), empresa y, opcionalmente, coste por hora." },
        { p: "En la ficha de cada empleado («Ver horas») puedes:" },
        { list: [
          "Asignarle otra empresa.",
          "Fijar su coste: por hora, o con un salario mensual y sus horas semanales (el sistema calcula el coste por hora: salario ÷ (horas semanales × 52 ÷ 12)).",
          "Pedir su ubicación al fichar (geolocalización).",
          "Cambiarle la contraseña o desactivarlo (pierde el acceso al momento).",
          "Asignarle objetivos y revisar sus evidencias.",
          "Ver su calendario, sus fichajes, su coste del mes y exportar su informe o ver su factura.",
        ] },
      ],
    },
    {
      id: "fichar",
      title: "Fichar entrada y salida",
      audience: "employee",
      blocks: [
        { steps: [
          "En tu Dashboard pulsa «Registrar entrada». Verás un cronómetro y el total del día.",
          "Al terminar pulsa «Registrar salida». Antes puedes escribir qué has hecho y repartir las horas en proyectos.",
          "Puedes fichar varias veces al día (por ejemplo, mañana y tarde): el total del día las suma.",
        ] },
        { list: [
          "Si tu empresa pide ubicación, el navegador te pedirá permiso: sin permitirla no podrás fichar.",
          "Si tu empresa tiene autocierre, verás a qué hora se cerrará la jornada si olvidas fichar.",
          "También puedes fichar desde la extensión de Chrome, sin abrir la app.",
          "Los administradores también pueden fichar desde su Dashboard o desde «Mis horas».",
        ] },
      ],
    },
    {
      id: "calendario",
      title: "Calendario, ajustes y ausencias",
      audience: "employee",
      blocks: [
        { p: "El calendario del mes muestra las horas de cada día con colores (menos de 4 h, de 4 a 8 h, 8 h o más). Los días laborables pasados sin fichajes salen en rojo como «sin trabajar»." },
        { p: "Debajo verás la asistencia del mes en porcentaje, los días sin trabajar y la lista de fichajes (los 3 últimos días; el resto con «Ver más», de 10 en 10)." },
        { h: "Ajustar horas" },
        { steps: [
          "Pulsa un día del calendario.",
          "Corrige la entrada y la salida de un tramo, añade uno que olvidaste o elimínalo.",
          "Los cambios quedan marcados como «editado» y los ve tu administrador.",
        ] },
        { h: "Ausencias" },
        { p: "En el mismo día puedes marcar una ausencia: vacaciones, enfermedad, permiso con goce de sueldo o sin goce de sueldo. Con «Hasta» marcas un rango (solo los días laborables). También vale para días futuros, por ejemplo para planificar vacaciones. Los días con ausencia no cuentan como «sin trabajar»." },
      ],
    },
    {
      id: "proyectos",
      title: "Proyectos y tareas",
      audience: "all",
      blocks: [
        { p: "El administrador crea proyectos y sus tareas en Proyectos (dentro de cada empresa). Los empleados reparten sus horas entre ellos de forma opcional:" },
        { list: [
          "Al registrar la salida, en «Repartir horas en proyectos».",
          "Después, pulsando el día en el calendario («Guardar reparto»).",
          "El tiempo se escribe como 1:30 o 1,5 y el total no puede superar lo trabajado.",
        ] },
        { p: "En Proyectos el administrador ve las horas del mes por proyecto, por tarea y por empleado; cada empleado ve solo las suyas. Las tareas se marcan como hechas y los proyectos se pueden archivar." },
      ],
    },
    {
      id: "facturas",
      title: "Costes, informes y facturas",
      audience: "all",
      blocks: [
        { list: [
          "Coste a pagar = horas trabajadas × coste por hora del empleado. El administrador lo ve en el dashboard de la empresa y en la ficha de cada empleado.",
          "«Exportar informe del mes» descarga un CSV (se abre en Excel) con los fichajes y totales. El del administrador incluye costes; el del empleado, no.",
          "La factura del mes se genera sola y se va acumulando con cada fichaje cerrado. El empleado la ve en su Dashboard («Ver factura»); el administrador ve las de todos en Facturas.",
        ] },
        { h: "Para que la factura se pueda emitir" },
        { steps: [
          "El administrador fija el coste por hora (o el salario) del empleado.",
          "El empleado completa sus Datos de facturación: logo, NIF o CI, nombre, dirección, país y nombre del servicio (por ejemplo «Consultoría de Odoo»).",
          "Desde la factura, «Imprimir / Guardar PDF».",
        ] },
        { note: "Las facturas no incluyen impuestos (IVA, retenciones)." },
      ],
    },
    {
      id: "objetivos",
      title: "Objetivos",
      audience: "all",
      blocks: [
        { p: "El administrador asigna objetivos a cada empleado desde su ficha, con fecha límite opcional. El empleado los ve en Objetivos y, para marcar uno como cumplido, debe adjuntar un documento (PDF, Office, imagen…, hasta 2 MB) o un enlace de YouTube." },
        { p: "El administrador ve la evidencia en la ficha del empleado y puede reabrir o eliminar el objetivo. Los vencidos se marcan en rojo." },
      ],
    },
    {
      id: "correo",
      title: "Correo",
      audience: "all",
      blocks: [
        { p: "Cada usuario puede conectar su buzón de correo (de cualquier proveedor con IMAP y SMTP) en Correo → Configuración. El administrador también puede configurarlo por él desde Correo." },
        { list: [
          "Entrada (IMAP): servidor, puerto 993 con SSL (o 143 con STARTTLS), usuario y contraseña.",
          "Salida (SMTP): servidor, puerto 465 con SSL (o 587 con STARTTLS), usuario y contraseña.",
          "Al guardar se prueba la conexión. Con Gmail u Outlook usa una «contraseña de aplicación».",
          "Puedes leer, responder y redactar correos y descargar adjuntos.",
        ] },
        { note: "El administrador puede consultar los buzones de todos en modo solo lectura (no marca los correos como leídos). Los empleados ven un aviso de ello. Las contraseñas se guardan cifradas." },
      ],
    },
    {
      id: "chat",
      title: "Chat y agente IA",
      audience: "all",
      blocks: [
        { p: "En Chat puedes escribir a cualquier compañero de tu empresa y a los administradores. Los mensajes nuevos aparecen solos y los no leídos se marcan con un contador." },
        { p: "Si el administrador lo activa, aparece el «Asistente IA»: un agente basado en ChatGPT. El administrador lo configura al final de la página de Chat con su token de OpenAI, el modelo y las instrucciones." },
        { note: "Los mensajes al asistente se envían a OpenAI para generar la respuesta." },
      ],
    },
    {
      id: "enlaces-docs",
      title: "Enlaces y documentación de la empresa",
      audience: "all",
      blocks: [
        { list: [
          "Enlaces: el administrador guarda accesos con URL, usuario y contraseña. Los empleados los ven y pueden copiar el usuario o mostrar/copiar la contraseña (se guarda cifrada).",
          "Documentación: el administrador crea carpetas y sube ficheros (hasta 2 MB cada uno). Los empleados navegan por las carpetas y descargan los documentos.",
        ] },
      ],
    },
    {
      id: "mapa",
      title: "Geolocalización y mapa",
      audience: "admin",
      blocks: [
        { p: "Si activas «Pedir ubicación al fichar» en la ficha de un empleado, cada entrada y salida guarda su ubicación y su precisión. En Mapa ves los fichajes de cada día sobre OpenStreetMap (entrada en verde, salida en rojo), filtrables por empresa." },
      ],
    },
    {
      id: "perfil",
      title: "Mi perfil",
      audience: "all",
      blocks: [
        { p: "Pulsando tu nombre arriba a la derecha (o en Mi perfil) puedes subir tu foto (PNG, JPG o WebP, hasta 300 KB) y cambiar tu contraseña indicando la actual." },
      ],
    },
    {
      id: "extension",
      title: "Extensión de Chrome",
      audience: "employee",
      blocks: [
        { p: "Con la extensión fichas desde la barra del navegador sin abrir la app. En la página de inicio tienes la descarga y los pasos de instalación y uso." },
      ],
    },
    {
      id: "seguridad",
      title: "Seguridad y privacidad",
      audience: "all",
      blocks: [
        { list: [
          "Las contraseñas de acceso las gestiona falcondatabase; la app nunca las guarda.",
          "Las contraseñas de enlaces, buzones y el token de OpenAI se guardan cifradas (AES-256).",
          "Cada empleado solo ve sus propios datos; el administrador ve los de todos.",
          "Un empleado desactivado pierde el acceso al momento, incluso con la sesión abierta.",
        ] },
      ],
    },
    {
      id: "faq",
      title: "Preguntas frecuentes",
      audience: "all",
      blocks: [
        { h: "Olvidé fichar la salida" },
        { p: "Si tu empresa tiene autocierre, se cerró sola. Si no, pulsa el día en el calendario y corrige la salida (cuando la hayas registrado)." },
        { h: "No me deja fichar: pide ubicación" },
        { p: "Tu empresa exige ubicación. Permite el acceso a la ubicación en el navegador (icono del candado junto a la dirección) y vuelve a intentarlo." },
        { h: "Mi factura dice que falta información" },
        { p: "Completa todos los campos de Datos de facturación, incluido el logo. Si falta el coste por hora, debe fijarlo tu administrador." },
        { h: "Olvidé mi contraseña" },
        { p: "Pídele a tu administrador que te asigne una nueva desde tu ficha y cámbiala después en Mi perfil." },
      ],
    },
  ],
};

const en: DocsContent = {
  title: "FalconTeams documentation",
  lead: "Complete guide for administrators and employees: how to set up your company, clock in, manage hours, projects, invoices and everything else.",
  toc: "Contents",
  audience: { admin: "Admin", employee: "Employee", all: "Everyone" },
  quickTitle: "Getting started",
  quick: [
    {
      title: "If you are an administrator",
      steps: [
        "Sign in at /login with your administrator account.",
        "Create your company in Companies and choose its address (for example “acme” → /acme/login).",
        "Add your employees in Employees, with their company and their hourly rate or salary.",
        "Send each employee their company login address and initial password.",
      ],
    },
    {
      title: "If you are an employee",
      steps: [
        "Go to your company address (for example /acme/login) and sign in with the email and password you were given.",
        "Click “Clock in” when you start and “Clock out” when you finish.",
        "Check your calendar: days worked, absences and hours of the month.",
        "Change your password in My profile and, if you invoice, complete your billing details.",
      ],
    },
  ],
  sections: [
    {
      id: "que-es",
      title: "What FalconTeams is",
      audience: "all",
      blocks: [
        { p: "FalconTeams is a time tracking and team management system. Each company has its own login address for its employees and an administrator who manages everything." },
        { p: "There are two roles:" },
        {
          list: [
            "Administrator: creates companies and employees, sees everyone's hours and costs, invoices, the clock-in map and mailboxes, and configures each company.",
            "Employee: clocks in and out, sees their calendar, splits their hours across projects, marks absences, completes goals, uses mail and chat, and generates their monthly invoice.",
          ],
        },
      ],
    },
    {
      id: "acceso",
      title: "Sign in and language",
      audience: "all",
      blocks: [
        { list: [
          "Administrators: /login.",
          "Employees: their company address, for example /acme/login (they can also use /login and will land in their company).",
          "Sessions last 7 days. To leave, click “Log out” at the top right.",
          "At the top you can switch the language (ES/EN) and the theme (light, dark or system).",
          "The left menu takes you to each section; on mobile open it with “☰ Menu”.",
        ] },
      ],
    },
    {
      id: "empresas",
      title: "Companies",
      audience: "admin",
      blocks: [
        { p: "In Companies you create each company with its name and address (slug). Its employees sign in at /<address>/login." },
        { list: [
          "Rename and enable/disable: a disabled company does not let its employees sign in or clock in.",
          "Auto clock-out: if an employee forgets to clock out, the entry closes automatically after the set hours (8 by default), with clock-out = clock-in + limit, and is marked “auto clock-out”.",
          "Company dashboard (/<address>): employees, who is working, hours and cost of the month, and a calendar with total hours.",
        ] },
        { note: "Auto clock-out is applied whenever the app reads time entries. To close them even if nobody opens the app, schedule a periodic call to /api/cron/auto-close with the CRON_SECRET variable." },
      ],
    },
    {
      id: "empleados",
      title: "Employees",
      audience: "admin",
      blocks: [
        { p: "In Employees you add each person with their name, email, initial password (at least 8 characters), company and, optionally, hourly rate." },
        { p: "In each employee's page (“View hours”) you can:" },
        { list: [
          "Assign another company.",
          "Set their cost: hourly, or a monthly salary plus weekly hours (the hourly rate is calculated as salary ÷ (weekly hours × 52 ÷ 12)).",
          "Require their location when clocking in (geolocation).",
          "Change their password or deactivate them (access is removed immediately).",
          "Assign goals and review their evidence.",
          "See their calendar, time entries, monthly cost, export their report or view their invoice.",
        ] },
      ],
    },
    {
      id: "fichar",
      title: "Clocking in and out",
      audience: "employee",
      blocks: [
        { steps: [
          "In your Dashboard click “Clock in”. You will see a timer and the total for the day.",
          "When you finish click “Clock out”. Before that you can write what you did and split the hours across projects.",
          "You can clock in several times a day (for example morning and afternoon): the day total adds them up.",
        ] },
        { list: [
          "If your company requires location, your browser will ask for permission: you cannot clock in without it.",
          "If your company uses auto clock-out, you will see when your shift will close if you forget.",
          "You can also clock in from the Chrome extension, without opening the app.",
          "Administrators can clock in too, from their Dashboard or “My hours”.",
        ] },
      ],
    },
    {
      id: "calendario",
      title: "Calendar, adjustments and absences",
      audience: "employee",
      blocks: [
        { p: "The monthly calendar shows each day's hours with colours (under 4 h, 4 to 8 h, 8 h or more). Past working days with no time logged show in red as “not worked”." },
        { p: "Below you will see the month's attendance percentage, the days not worked and your time entries (the last 3 days; the rest with “Show more”, 10 at a time)." },
        { h: "Adjusting hours" },
        { steps: [
          "Click a day in the calendar.",
          "Correct the start and end of a shift, add one you forgot, or delete it.",
          "Changes are marked as “edited” and your administrator can see them.",
        ] },
        { h: "Absences" },
        { p: "On the same day page you can mark an absence: vacation, sick leave, paid leave or unpaid leave. With “Until” you mark a range (working days only). It also works for future days, for example to plan your vacation. Days with an absence do not count as “not worked”." },
      ],
    },
    {
      id: "proyectos",
      title: "Projects and tasks",
      audience: "all",
      blocks: [
        { p: "The administrator creates projects and their tasks in Projects (inside each company). Employees can optionally split their hours across them:" },
        { list: [
          "When clocking out, in “Split hours across projects”.",
          "Later, by clicking the day in the calendar (“Save split”).",
          "Time is written as 1:30 or 1.5 and the total cannot exceed the time worked.",
        ] },
        { p: "In Projects the administrator sees the month's hours per project, task and employee; each employee sees only their own. Tasks can be marked done and projects can be archived." },
      ],
    },
    {
      id: "facturas",
      title: "Costs, reports and invoices",
      audience: "all",
      blocks: [
        { list: [
          "Cost to pay = hours worked × the employee's hourly rate. The administrator sees it on the company dashboard and each employee's page.",
          "“Export monthly report” downloads a CSV (opens in Excel) with time entries and totals. The administrator's includes costs; the employee's does not.",
          "The monthly invoice is generated automatically and grows with every closed time entry. Employees see it on their Dashboard (“View invoice”); administrators see everyone's in Invoices.",
        ] },
        { h: "To be able to issue the invoice" },
        { steps: [
          "The administrator sets the employee's hourly rate (or salary).",
          "The employee completes their Billing details: logo, tax ID, name, address, country and service name (for example “Odoo consulting”).",
          "From the invoice, “Print / Save PDF”.",
        ] },
        { note: "Invoices do not include taxes (VAT, withholdings)." },
      ],
    },
    {
      id: "objetivos",
      title: "Goals",
      audience: "all",
      blocks: [
        { p: "The administrator assigns goals to each employee from their page, with an optional due date. Employees see them in Goals and, to mark one as done, must attach a document (PDF, Office, image…, up to 2 MB) or a YouTube link." },
        { p: "The administrator sees the evidence on the employee's page and can reopen or delete the goal. Overdue goals are shown in red." },
      ],
    },
    {
      id: "correo",
      title: "Mail",
      audience: "all",
      blocks: [
        { p: "Each user can connect their mailbox (from any provider with IMAP and SMTP) in Mail → Settings. The administrator can also set it up for them from Mail." },
        { list: [
          "Incoming (IMAP): server, port 993 with SSL (or 143 with STARTTLS), user and password.",
          "Outgoing (SMTP): server, port 465 with SSL (or 587 with STARTTLS), user and password.",
          "The connection is tested when saving. With Gmail or Outlook use an “app password”.",
          "You can read, reply, compose and download attachments.",
        ] },
        { note: "The administrator can read everyone's mailboxes in read-only mode (messages are not marked as read). Employees see a notice about it. Passwords are stored encrypted." },
      ],
    },
    {
      id: "chat",
      title: "Chat and AI agent",
      audience: "all",
      blocks: [
        { p: "In Chat you can write to any colleague in your company and to the administrators. New messages appear automatically and unread ones show a counter." },
        { p: "If the administrator enables it, the “AI assistant” appears: an agent based on ChatGPT. The administrator configures it at the bottom of the Chat page with their OpenAI token, the model and the instructions." },
        { note: "Messages to the assistant are sent to OpenAI to generate the answer." },
      ],
    },
    {
      id: "enlaces-docs",
      title: "Company links and documents",
      audience: "all",
      blocks: [
        { list: [
          "Links: the administrator stores accesses with URL, username and password. Employees see them and can copy the username or show/copy the password (stored encrypted).",
          "Documents: the administrator creates folders and uploads files (up to 2 MB each). Employees browse the folders and download the documents.",
        ] },
      ],
    },
    {
      id: "mapa",
      title: "Geolocation and map",
      audience: "admin",
      blocks: [
        { p: "If you enable “Require location when clocking in” on an employee's page, each clock-in and clock-out stores its location and accuracy. In Map you see each day's entries on OpenStreetMap (clock-in in green, clock-out in red), filterable by company." },
      ],
    },
    {
      id: "perfil",
      title: "My profile",
      audience: "all",
      blocks: [
        { p: "Clicking your name at the top right (or My profile) lets you upload your photo (PNG, JPG or WebP, up to 300 KB) and change your password by entering the current one." },
      ],
    },
    {
      id: "extension",
      title: "Chrome extension",
      audience: "employee",
      blocks: [
        { p: "With the extension you clock in from the browser toolbar without opening the app. The home page has the download and the install and usage steps." },
      ],
    },
    {
      id: "seguridad",
      title: "Security and privacy",
      audience: "all",
      blocks: [
        { list: [
          "Login passwords are handled by falcondatabase; the app never stores them.",
          "Link passwords, mailbox passwords and the OpenAI token are stored encrypted (AES-256).",
          "Each employee only sees their own data; the administrator sees everyone's.",
          "A deactivated employee loses access immediately, even with an open session.",
        ] },
      ],
    },
    {
      id: "faq",
      title: "Frequently asked questions",
      audience: "all",
      blocks: [
        { h: "I forgot to clock out" },
        { p: "If your company uses auto clock-out, it closed automatically. Otherwise, click the day in the calendar and correct the clock-out (once it has been recorded)." },
        { h: "I can't clock in: it asks for my location" },
        { p: "Your company requires location. Allow location access in your browser (lock icon next to the address) and try again." },
        { h: "My invoice says information is missing" },
        { p: "Complete every field in Billing details, including the logo. If the hourly rate is missing, your administrator must set it." },
        { h: "I forgot my password" },
        { p: "Ask your administrator to set a new one from your page, then change it in My profile." },
      ],
    },
  ],
};

export const DOCS: Record<Locale, DocsContent> = { es, en };
