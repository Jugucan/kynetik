# Guia de Desplegament

## 1. Configurar GitHub

1. Connecta el projecte a GitHub des de Lovable (botó GitHub a dalt a la dreta)
2. O manualment: crea un repositori a GitHub i puja el codi

## 2. Configurar Firebase

1. Ves a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nou projecte
3. Afegeix una aplicació web al projecte
4. Copia les credencials de configuració
5. A Firebase Console:
   - Activa **Authentication** > Email/Password
   - Crea una base de dades **Firestore** en mode producció

## 3. Configurar Variables d'Entorn a Netlify

1. Ves a [Netlify](https://app.netlify.com/)
2. Clica "Add new site" > "Import an existing project"
3. Connecta amb GitHub i selecciona el repositori
4. A "Site settings" > "Environment variables", afegeix:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## 4. Desplegament

Netlify desplegarà automàticament cada cop que facis push a GitHub.

## Desenvolupament Local

1. Copia `.env.example` a `.env`
2. Omple les variables amb les teves credencials de Firebase
3. Executa `npm install`
4. Executa `npm run dev`

## Estructura Firestore Recomanada

```
users/
  {userId}/
    name: string
    email: string
    age: number
    center: string
    phone: string
    birthday: timestamp

programs/
  {programId}/
    code: string
    name: string
    color: string
    center: string

sessions/
  {sessionId}/
    date: timestamp
    programId: string
    startTime: string
    endTime: string
    center: string

holidays/
  {holidayId}/
    name: string
    date: timestamp

vacations/
  {vacationId}/
    startDate: timestamp
    endDate: timestamp
    center: string
```
