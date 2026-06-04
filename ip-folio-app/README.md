# IP Folio — app interna de cartera de PI

App interna para gestionar la cartera de propiedad intelectual: pipeline de 7 etapas,
portafolio protegido, vencimientos, rutas/principios de la metodología y una **consulta
con IA (Modo A)** que usa el kit como cerebro. Independiente del contract manager.

Stack: **React + Vite** (frontend) · **Supabase** (auth + base de datos) ·
**Netlify** (hosting + función serverless para la IA).

---

## Qué hay en el proyecto
```
ip-folio-app/
├── index.html                      # Tailwind por CDN
├── package.json · vite.config.js · netlify.toml · .env.example
├── src/
│   ├── main.jsx                    # arranque + pasarela de login
│   ├── Login.jsx                   # acceso del equipo (Supabase auth)
│   ├── App.jsx                     # la app (pipeline, portafolio, rutas, consulta IA…)
│   └── supabaseClient.js
├── netlify/functions/
│   └── consulta-ia.js              # Modo A: llama a Claude con la API key en el servidor
└── supabase/
    └── schema.sql                  # tabla assets + vocabulario + RLS + vista de vencimientos
```

## Lo que necesitas (cuentas tuyas)
- **Node.js 18+** instalado.
- Una cuenta de **Supabase** (gratis para empezar).
- Una cuenta de **Netlify** (la que ya usas).
- Una **API key de Anthropic** (console.anthropic.com) para la consulta IA.

## Puesta en marcha (paso a paso)

**1. Instalar dependencias**
```bash
cd ip-folio-app
npm install
```

**2. Crear el proyecto en Supabase**
- Crea un proyecto nuevo. En *Project Settings → API* copia la **Project URL** y la **anon public key**.

**3. Crear la base de datos**
- En Supabase, *SQL Editor* → pega el contenido de `supabase/schema.sql` → *Run*.

**4. Crear los usuarios del equipo**
- *Authentication → Users → Add user* (email + contraseña) para cada persona. No hay registro público.

**5. Variables de entorno (local)**
- Copia `.env.example` a `.env` y rellena:
```
VITE_SUPABASE_URL=...        # la Project URL del paso 2
VITE_SUPABASE_ANON_KEY=...   # la anon public key del paso 2
```

**6. Probar en local**
```bash
npm run dev
```
Entra con un usuario del paso 4. En el Panel, pulsa **"Cargar ejemplos"** para ver la app
poblada (datos del collar canino); bórralos cuando metas datos reales.
> Nota: la consulta IA del paso siguiente solo funciona ya desplegada en Netlify (necesita la función). En local verás el resto de la app.

**7. Desplegar en Netlify**
- Sube el proyecto a un repositorio y conéctalo en Netlify (o usa `netlify deploy`).
- En *Site settings → Environment variables* añade las **tres**:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (las del paso 2)
  - `ANTHROPIC_API_KEY` (tu clave de Anthropic — **solo aquí, nunca en el frontend**)
- Deploy. Netlify hace `npm run build` y publica `dist/`, y expone la función en
  `/.netlify/functions/consulta-ia`.

## Notas importantes
- **Seguridad**: la API key de Anthropic vive solo en Netlify (la función serverless). El
  frontend nunca la ve.
- **Modelo de IA**: en `netlify/functions/consulta-ia.js` el modelo está como
  `claude-sonnet-4-6`. **Confirma el string de modelo y la tarifa vigentes en
  https://docs.claude.com** antes de usarlo en serio.
- **Prompt de la IA**: la función lleva una versión condensada del Modo A. Para producción,
  sustitúyela por el contenido completo de `KIT-PORTATIL-IP.md` como system prompt.
- **Secretos comerciales**: el contenido no se almacena; solo su existencia y medidas.
- **Límite**: toda salida de IA es cribado / información general, no asesoría legal. Las
  decisiones de alto valor las valida un abogado de PI.
- **Tailwind por CDN**: vale para uso interno; para producción seria conviene migrar a un
  build de Tailwind (PostCSS).

## Tras el primer despliegue
No he podido probar la integración contra tu Supabase/Netlify reales desde donde se generó
el código, así que es normal que aparezca algún ajuste (políticas RLS, variables, CORS de la
función). Pásame el error concreto y lo afinamos.
