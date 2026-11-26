# VidShare — publiczne filmy MP4

Wrzucasz film MP4 → widzi go każdy odwiedzający. Zakładki: Główna (kategorie, sortowanie, wyszukiwarka), Prześlij, Ulubione, Historia, Ustawienia (odtwarzacz / wygląd / konto / dane), O aplikacji.

Hosting: Vercel (funkcje w `api/`) + Vercel Blob (pliki wideo).

## Zmienne środowiskowe
- `BLOB_READ_WRITE_TOKEN` — dodawany automatycznie po podłączeniu magazynu Blob
- `ADMIN_PASSWORD` — hasło do usuwania filmów (opcjonalne)
- `MAX_UPLOAD_MB` — limit rozmiaru pliku, domyślnie 500
