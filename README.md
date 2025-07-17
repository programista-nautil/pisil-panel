# PISiL Panel

Platforma do wypełniania formularzy online "Deklaracja Członkowska PISiL", generowania PDF, podpisywania elektronicznego i zarządzania przez panel administracyjny.

## Funkcjonalności (MVP)

- ✅ Formularz wypełniania deklaracji członkowskiej
- ✅ Generowanie PDF z wypełnionych danych
- ✅ Upload podpisanego PDF
- ✅ Walidacja obecności podpisu elektronicznego
- ✅ Powiadomienia email (admin + użytkownik)

## Stack Technologiczny

- **Frontend**: Next.js 15 + Tailwind CSS
- **Backend**: Next.js API Routes
- **PDF**: jsPDF + html2canvas
- **Walidacja podpisu**: pdf-lib
- **Email**: Nodemailer
- **Upload**: Multer

## Instalacja

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000) w przeglądarce.

## Struktura Projektu

```
pisil-panel/
├── src/
│   ├── app/
│   │   ├── page.js          # Strona główna z formularzem
│   │   ├── api/
│   │   │   ├── generate-pdf # Generowanie PDF
│   │   │   ├── upload       # Upload pliku
│   │   │   └── send-email   # Wysyłanie powiadomień
│   ├── components/
│   │   ├── FormComponent.js
│   │   ├── PDFGenerator.js
│   │   └── FileUpload.js
│   └── lib/
│       ├── pdf-utils.js     # Utilities do PDF
│       ├── email-service.js # Service email
│       └── file-validation.js # Walidacja plików
```

## Rozwój

Projekt jest rozwijany zgodnie z instrukcjami w `.github/copilot-instructions.md`.

## Kontakt

Email admina: programista@nautil.pl
