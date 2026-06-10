# Fooduś — Inteligentny Planer Diety

Premium SaaS-style aplikacja do planowania diety i treningu (14-dniowy planer) z generowaniem posiłków przez AI (Google Gemini). Zbudowana w React + TypeScript + Vite + Tailwind + Framer Motion. Logowanie przez Google, dane synchronizowane w Firebase Firestore.

## Funkcje

- 🔐 Logowanie przez Google (Firebase Auth)
- ☁️ Synchronizacja danych w chmurze (Firestore) — dostępne na każdym urządzeniu
- 🍽️ 14-dniowy interaktywny planer diety
- ✨ Generowanie pełnego dnia / wymiana posiłku przez AI (Gemini)
- 🧊 "Co mam w lodówce?" — AI proponuje posiłki z podanych składników
- ➕ Ręczne dodawanie posiłków
- 📋 Kopiowanie całych dni i pojedynczych posiłków między dniami
- 📊 Śledzenie makro (kalorie, białko, węgle, tłuszcze)
- 🏋️ Plan treningowy (split Góra/Dół) + licznik kroków
- 🛒 Generator listy zakupów i przepisów
- ↩️ Cofnij (historia zmian)
- 📱 Responsywność (desktop + mobile)

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Zmienne środowiskowe

Skopiuj `.env.example` do `.env` i ustaw:

```
VITE_GEMINI_API_KEY=twój_klucz_api
```

Klucz API można też wpisać bezpośrednio w aplikacji (panel "Profil & Cele").

## Deploy na Vercel

1. Zaimportuj repozytorium w Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`, Output dir: `dist`.
4. W "Environment Variables" dodaj `VITE_GEMINI_API_KEY` (opcjonalnie).
5. Deploy.

`vercel.json` zawiera już rewrites dla SPA.

## Firebase — konfiguracja

W [Firebase Console](https://console.firebase.google.com):
- **Authentication** → Sign-in method → włącz **Google**.
- Dodaj domenę Vercel (np. `twoja-app.vercel.app`) do **Authorized domains**.
- **Firestore Database** → utwórz bazę. Reguły bezpieczeństwa:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
