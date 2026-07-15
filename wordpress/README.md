# WordPress — wtyczka „PISiL — Wydarzenia"

Kod wtyczki instalowanej na **pisil.pl** (WordPress + Elementor Pro + WooCommerce, hosting hekko24/LiteSpeed).
To NIE jest część aplikacji Next.js — leży tu tylko po to, żeby kod był wersjonowany i nie ginął.

Na serwerze plik żyje pod: `wp-content/plugins/pisil-events/pisil-events.php`
(folder nazywa się `pisil-events`, nie `pisil-wydarzenia` — historyczna pozostałość, nie zmieniać).

## Co robi

Panel (`panel.pisil.pl`) jest **jedynym źródłem prawdy**. WordPress nie dostaje kopii danych — pobiera
wydarzenia na żywo z publicznego API i renderuje. Wtyczka daje trzy rzeczy:

1. **Skrót `[pisil_wydarzenia typ="KONFERENCJA|SZKOLENIE"]`** — lista wydarzeń w formacie istniejących
   konferencji: nagłówek „Nazwa – data, miejsce" + przycisk „Zobacz szczegóły i zapisz się" + rozwijane
   bloki (Informacje / Program / Galeria zdjęć / Relacja wideo). Bez wydarzeń renderuje **pustkę**
   (żeby nie zaśmiecać strony). Wstawiony na stronach:
   - **Kongres i konferencje** — post ID `18743`
   - **Szkolenia PISiL** — post ID `3066`
2. **Strony `/wydarzenia/{slug}`** — jeden szablon dla wszystkich wydarzeń przez regułę przepisywania
   (`add_rewrite_rule`). **Nie tworzymy wpisu/strony per wydarzenie** — to jest kluczowa decyzja.
3. **Formularz zapisu** — wysyłany przez `admin-post.php` (nonce + honeypot) → `POST /api/public/events/{slug}/registrations`.

## Wdrożenie (re-upload ZIP)

EMCP nie ma zapisu plików, więc wdrożenie = zbudowanie ZIP-a i wgranie przez panel WP:
Wtyczki → Dodaj wtyczkę → Wyślij → Zainstaluj → **„Zastąp obecne przesłanym"**.

> ⚠️ **GRUBY HACZYK:** PowerShell `Compress-Archive` pakuje ścieżki z ukośnikiem odwrotnym `\`.
> Linux/WordPress rozpakowuje to krzywo → połamane nazwy plików, których WP **nie umie usunąć**
> (duplikaty wracają po „usunięciu"; sprzątanie tylko przez menedżer plików hostingu).
> ZIP **musi** mieć ukośnik `/`:

```powershell
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$src = "wordpress\pisil-events\pisil-events.php"
$zip = "$env:USERPROFILE\Downloads\pisil-events.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
$fs = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($fs, $src, 'pisil-events/pisil-events.php')
$fs.Dispose()
```

Sprawdzenie składni przed wgraniem (na VPS jest PHP, lokalnie nie ma):
```bash
scp wordpress/pisil-events/pisil-events.php programista@<vps>:/tmp/lint.php
ssh programista@<vps> "php -l /tmp/lint.php; rm -f /tmp/lint.php"
```
Błąd składni w aktywnej wtyczce = **biały ekran na całej stronie**. Nie pomijać lintu.

## Dlaczego w kodzie są trzy dziwne haki na Elementora

Strony `/wydarzenia/{slug}` są **wirtualne** (rewrite + zmienna zapytania, brak realnego wpisu).
Elementor domyślnie ich „nie widzi" i renderuje się połowicznie. Wszystkie trzy poprawki są potrzebne razem:

1. **Kontekst realnej strony** (hook `wp`) — podstawiamy opublikowaną stronę-rodzica (18743/3066) jako
   obiekt zapytania, żeby Elementor potraktował to jak normalną stronę.
2. **Wymuszenie frontendu** (`wp_enqueue_scripts`, prio 20) — pliki JS Elementora ładują się jako zależności,
   ale **bez konfiguracji inline** (`elementorFrontendConfig`), więc `elementor-frontend.js` się nie
   inicjalizuje i widżety nagłówka zostają `visibility:hidden`. `frontend->enqueue_scripts()` drukuje
   konfigurację rdzenia i przez hook `elementor/frontend/after_enqueue_scripts` dokłada zasoby Elementor Pro (menu).
3. **Klasa zestawu na `<body>`** (`body_class`) — kolory globalne (`--e-global-color-primary` = granat
   `#0A284F`) są zdefiniowane pod `.elementor-kit-{id}`. Bez tej klasy zmienne są puste i sekcje
   z kolorem globalnym tracą tło (np. granatowy newsletter w stopce robił się przezroczysty).

> 🕳️ **Pułapka przy debugowaniu:** kontenery Elementora mają `transition: background .3s`, więc szybkie
> pomiary `getComputedStyle` przez JS łapią kolor „w połowie animacji" i dają sprzeczne wyniki.
> Najpierw `el.style.transition='none'`, dopiero potem mierz.

## Dane testowe

`scripts/seed-test-events.cjs` zakłada komplet testowych wydarzeń pokrywających wszystkie przypadki
(typ × tryb × ceny × limit × statusy × pola puste/pełne). Uruchamiać **z katalogu aplikacji** (potrzebuje
`node_modules` i `.env`):

```bash
node scripts/seed-test-events.cjs          # zakłada (idempotentnie, upsert po slugu)
node scripts/seed-test-events.cjs --usun   # kasuje WSZYSTKIE wydarzenia o slugu "test-*"
```

⚠️ Wydarzenia ze statusem `PUBLISHED` pojawiają się **natychmiast i publicznie** na pisil.pl.
Po testach na produkcji zawsze sprzątnąć (`--usun`).
