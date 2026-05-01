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

## Deployment Guidelines

### Environment Variables

To run this project outside of AI Studio (e.g., on Netlify or Vercel), you must configure the following environment variables:

- `GEMINI_API_KEY`: Your Google AI SDK key.
- `VITE_FIREBASE_API_KEY`: Firebase Web API Key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain.
- `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID.
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID.
- `VITE_FIREBASE_APP_ID`: Firebase App ID.
- `VITE_FIREBASE_DATABASE_ID`: (Optional) The Firestore database ID (defaults to `(default)`).

### Local Development

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Start the dev server: `npm run dev`.
