# Vigor AI - Calorie Tracker

A high-performance, AI-powered nutritional tracking application built with React, Vite, and Firebase.

## Key Features

- **AI Biological Estimation**: Log food via natural language or biological signatures.
- **Visual Extraction Protocol**: Extract macros directly from food label photos using Gemini AI.
- **Nutritional Library**: Manage your own database of food items with manual overrides.
- **Cloud Sync**: Automatically sync daily totals to Google Sheets for long-term data archival.
- **Biometric Dashboard**: Track calories, protein, carbs, and fats with real-time feedback.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Motion (Framer Motion)
- **Database/Auth**: Firebase Firestore & Authentication
- **AI Engine**: Google Gemini AI (Pro & Flash models)
- **Automation**: Google Sheets API

## Deployment Guidelines (e.g. Netlify)

### 1. GitHub Connection
Push your code to a GitHub repository.

### 2. Environment Variables
In the Netlify dashboard (Site Settings > Build & Deploy > Environment), add the following variables:
- `GEMINI_API_KEY`: Your Google AI SDK key.
- `VITE_FIREBASE_API_KEY`: Firebase Web API Key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain.
- `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID.
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID.
- `VITE_FIREBASE_APP_ID`: Firebase App ID.
- `VITE_FIREBASE_DATABASE_ID`: (Optional) The Firestore database ID (defaults to `(default)`).

### 3. Deploy
Trigger a new deploy on Netlify. Static sites require a **build** to bake these variables into the JavaScript bundle. AI features will not work until the `GEMINI_API_KEY` is correctly provided and the site is rebuilt.

### Local Development

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Start the dev server: `npm run dev`.
