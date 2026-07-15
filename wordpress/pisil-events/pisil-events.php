<?php
/**
 * Plugin Name: PISiL — Wydarzenia (integracja z panelem)
 * Description: Lista i zapisy na szkolenia/konferencje pobierane na żywo z panelu PISiL (panel.pisil.pl). Skrót [pisil_wydarzenia] + strony /wydarzenia/{slug}.
 * Version: 1.8.0
 * Author: PISiL / Nautil
 */

if (!defined('ABSPATH')) exit;

define('PISIL_API', 'https://panel.pisil.pl');       // źródło danych (panel)
define('PISIL_CACHE', 10 * MINUTE_IN_SECONDS);       // bufor listy/szczegółów

/* =========================================================================
 * 1) ADRESY: /wydarzenia/{slug} → jeden szablon dla wszystkich wydarzeń
 * =======================================================================*/
add_action('init', function () {
	add_rewrite_rule('^wydarzenia/([^/]+)/?$', 'index.php?pisil_event=$matches[1]', 'top');
});
add_filter('query_vars', fn($v) => array_merge($v, ['pisil_event']));
register_activation_hook(__FILE__, function () {
	add_rewrite_rule('^wydarzenia/([^/]+)/?$', 'index.php?pisil_event=$matches[1]', 'top');
	flush_rewrite_rules();
});
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

// Kontekst realnej strony Elementora dla /wydarzenia/{slug}. Bez tego Elementor NIE ładuje swojego
// frontendu (JS/CSS/config) na wirtualnej stronie, więc nie odsłania widżetów nagłówka (logo, menu,
// kontakt) — zostają `visibility:hidden`. Podstawiamy realną, opublikowaną stronę (Konferencje/Szkolenia)
// jako obiekt zapytania → Elementor w pełni się inicjalizuje i nagłówek/stopka renderują się jak wszędzie.
add_action('wp', function () {
	$slug = get_query_var('pisil_event');
	if (!$slug) return;
	$ev = pisil_api_get('/api/public/events/' . rawurlencode($slug));
	$parent = pisil_parent(!empty($ev) ? ($ev['typ'] ?? '') : '');
	$host = get_post($parent['id']);
	if (!$host) return;
	global $wp_query;
	$wp_query->is_404 = false;
	$wp_query->is_page = true;
	$wp_query->is_singular = true;
	$wp_query->is_home = false;
	$wp_query->is_front_page = false;
	$wp_query->queried_object = $host;
	$wp_query->queried_object_id = $host->ID;
	$wp_query->post = $host;
	$wp_query->posts = array($host);
	$wp_query->post_count = 1;
	$wp_query->found_posts = 1;
	$GLOBALS['post'] = $host;
});

// Adres kanoniczny (SEO): mimo „udawania" strony-rodzica, kanoniczny ma wskazywać na samą stronę wydarzenia.
add_filter('wpseo_canonical', 'pisil_canonical');            // Yoast
add_filter('get_canonical_url', 'pisil_canonical');          // rdzeń WP
function pisil_canonical($url) {
	$slug = get_query_var('pisil_event');
	return $slug ? home_url('/wydarzenia/' . $slug . '/') : $url;
}

// WYMUSZENIE FRONTENDU ELEMENTORA na naszej wirtualnej stronie. Elementor („optimized asset loading")
// nie ładuje swojego JS/CSS, gdy nie wykryje treści Elementora w zapytaniu — przez co nie odsłania
// widżetów nagłówka/stopki (zostają visibility:hidden) i gubi tła sekcji. Wołamy enqueue ręcznie;
// core przez hook `elementor/frontend/after_enqueue_scripts` pociąga też zasoby Elementor Pro (menu).
add_action('wp_enqueue_scripts', function () {
	if (!get_query_var('pisil_event')) return;
	if (!class_exists('\Elementor\Plugin')) return;
	$el = \Elementor\Plugin::$instance;
	if (isset($el->frontend)) {
		$el->frontend->enqueue_styles();
		$el->frontend->enqueue_scripts();
	}
}, 20);

// KLASA ZESTAWU (KIT) NA <body>. Elementor definiuje kolory globalne (np. --e-global-color-primary = granat)
// pod selektorem `.elementor-kit-{id}` i normalnie dokleja tę klasę do <body>. Na wirtualnej stronie ta klasa
// nie trafia do body → zmienne kolorów są puste → sekcje/przyciski z kolorem globalnym tracą kolor
// (np. granatowe tło sekcji newslettera w stopce robiło się przezroczyste). Doklejamy klasę zestawu ręcznie.
add_filter('body_class', function ($classes) {
	if (!get_query_var('pisil_event')) return $classes;
	if (class_exists('\Elementor\Plugin')) {
		$kit_id = \Elementor\Plugin::$instance->kits_manager->get_active_id();
		if ($kit_id) $classes[] = 'elementor-kit-' . $kit_id;
	}
	if (!in_array('elementor-default', $classes, true)) $classes[] = 'elementor-default';
	return $classes;
});

/* =========================================================================
 * 2) POBIERANIE Z PANELU + BUFOR (cache-first: najpierw bufor, potem API)
 * =======================================================================*/
function pisil_api_get($path) {
	$key = 'pisil_' . md5($path);
	$cached = get_transient($key);
	if ($cached !== false) return $cached;                 // ← cache-first: nie odpytujemy panelu przez 10 min

	$res = wp_remote_get(PISIL_API . $path, ['timeout' => 8]);
	if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) {
		return null;                                       // panel nie odpowiada → puste (nie psujemy strony)
	}
	$data = json_decode(wp_remote_retrieve_body($res), true);
	set_transient($key, $data, PISIL_CACHE);
	return $data;
}

function pisil_date($iso) {
	if (!$iso) return '';
	$ts = strtotime($iso);
	return $ts ? date_i18n('j F Y, H:i', $ts) : '';
}
function pisil_date_short($iso) {           // sama data, bez godziny (do nagłówka „Nazwa – data, adres")
	if (!$iso) return '';
	$ts = strtotime($iso);
	return $ts ? date_i18n('j F Y', $ts) : '';
}
function pisil_pln($v) { return number_format((float) $v, 2, ',', ' ') . ' zł'; }

// Etykieta + adres + ID strony-rodzica (breadcrumb / kontekst nagłówka) wg typu wydarzenia
function pisil_parent($typ) {
	return $typ === 'KONFERENCJA'
		? ['label' => 'Kongres i konferencje', 'url' => home_url('/kongres-i-konferencje'), 'id' => 18743]
		: ['label' => 'Szkolenia PISiL', 'url' => home_url('/szkolenia-pisil'), 'id' => 3066];
}

/* =========================================================================
 * 3) LISTA — [pisil_wydarzenia typ="SZKOLENIE|KONFERENCJA"]  (belki-linki)
 * =======================================================================*/
add_shortcode('pisil_wydarzenia', function ($atts) {
	$atts = shortcode_atts(['typ' => '', 'empty' => ''], $atts, 'pisil_wydarzenia');
	$typ = strtoupper(trim($atts['typ']));

	$events = pisil_api_get('/api/public/events') ?: [];
	if ($typ) $events = array_values(array_filter($events, fn($e) => ($e['typ'] ?? '') === $typ));

	// Brak wydarzeń: domyślnie NIC nie renderujemy (żeby na bogatych stronach nie zaśmiecać).
	// Opcjonalnie [pisil_wydarzenia empty="Zapraszamy wkrótce"] pokaże komunikat.
	if (empty($events)) {
		return $atts['empty'] ? '<p class="pisil-empty">' . esc_html($atts['empty']) . '</p>' : '';
	}

	ob_start();
	echo '<div class="pisil-events">';
	foreach ($events as $ev) {
		$href = esc_url(home_url('/wydarzenia/' . $ev['slug']));
		// Nagłówek w formacie strony: „Nazwa – data, miejsce"
		$naglowek = $ev['title'] . ' – ' . pisil_date_short($ev['startAt']);
		if ($ev['tryb'] === 'STACJONARNE' && !empty($ev['address'])) {
			$naglowek .= ', ' . $ev['address'];
		} elseif ($ev['tryb'] === 'ONLINE') {
			$naglowek .= ' (online)';
		}
		echo '<div class="pisil-ev">';
		echo '  <h3 class="pisil-ev__title">' . esc_html($naglowek) . '</h3>';
		echo '  <a class="pisil-ev__btn" href="' . $href . '">Zobacz szczegóły i zapisz się</a>';
		echo pisil_render_accordion($ev);          // rozwijane bloki jak przy wcześniejszych konferencjach
		echo '</div>';
	}
	echo '</div>';
	echo pisil_style();
	return ob_get_clean();
});

/* =========================================================================
 * 4) STRONA POJEDYNCZEGO WYDARZENIA — /wydarzenia/{slug}
 * =======================================================================*/
add_action('template_redirect', function () {
	$slug = get_query_var('pisil_event');
	if (!$slug) return;

	$ev = pisil_api_get('/api/public/events/' . rawurlencode($slug));
	status_header(200);
	global $wp_query; $wp_query->is_404 = false;

	get_header();
	if (empty($ev)) {
		echo '<div class="pisil-wrap" style="padding:3rem 1rem"><p>Nie znaleziono wydarzenia. <a href="' . esc_url(home_url('/wydarzenia')) . '">Wróć do listy</a>.</p></div>';
	} else {
		echo pisil_render_event($ev);
	}
	echo pisil_style();
	get_footer();
	exit;
});

add_filter('document_title_parts', function ($parts) {
	$slug = get_query_var('pisil_event');
	if ($slug) {
		$ev = pisil_api_get('/api/public/events/' . rawurlencode($slug));
		if (!empty($ev['title'])) $parts['title'] = $ev['title'];
	}
	return $parts;
});

function pisil_render_event($ev) {
	$typ = $ev['typ'] === 'KONFERENCJA' ? 'Konferencja' : 'Szkolenie';
	$tryb = $ev['tryb'] === 'ONLINE' ? 'Online' : 'Stacjonarnie';
	$parent = pisil_parent($ev['typ']);
	$konf_gratis = ($ev['typ'] === 'KONFERENCJA' && !empty($ev['pulaGratisNaFirme']));
	$zapis = $_GET['zapis'] ?? '';

	// Ceny: 0 albo brak = bezpłatne. Bez tego karta zapisu przy wydarzeniu bez cen była po prostu
	// pusta (nic nie mówiła), zamiast wprost powiedzieć „udział bezpłatny”.
	$cenaC = isset($ev['cenaCzlonek']) ? (float) $ev['cenaCzlonek'] : 0;
	$cenaN = isset($ev['cenaNieczlonek']) ? (float) $ev['cenaNieczlonek'] : 0;
	$bezplatne = !$konf_gratis && $cenaC <= 0 && $cenaN <= 0;

	ob_start(); ?>
	<div class="pisil-hero">
		<div class="pisil-wrap">
			<nav class="pisil-crumb">
				<a href="<?php echo esc_url(home_url('/')); ?>">Strona główna</a> &rsaquo;
				<a href="<?php echo esc_url($parent['url']); ?>"><?php echo esc_html($parent['label']); ?></a> &rsaquo;
				<b><?php echo esc_html($ev['title']); ?></b>
			</nav>
			<h1 class="pisil-h1"><?php echo esc_html($ev['title']); ?></h1>
			<div class="pisil-meta">
				<span class="pisil-tag pisil-tag--navy"><?php echo esc_html($typ); ?></span>
				<span class="pisil-tag"><?php echo esc_html($tryb); ?></span>
				<span class="pisil-tag"><?php echo esc_html(pisil_date($ev['startAt'])); ?></span>
			</div>
		</div>
	</div>

	<div class="pisil-wrap pisil-grid">
		<div class="pisil-main">
			<?php if (!empty($ev['description'])): ?>
				<section class="pisil-sec"><h2>O wydarzeniu</h2><p class="pisil-lead"><?php echo nl2br(esc_html($ev['description'])); ?></p></section>
			<?php endif; ?>

			<section class="pisil-sec">
				<h2>Szczegóły</h2>
				<ul class="pisil-facts">
					<li><span class="k">Termin</span><span class="v"><?php echo esc_html(pisil_date($ev['startAt'])); echo !empty($ev['endAt']) ? ' – ' . esc_html(pisil_date($ev['endAt'])) : ''; ?></span></li>
					<li><span class="k">Forma</span><span class="v"><?php echo esc_html($tryb); ?></span></li>
					<?php if (!empty($ev['prowadzacy'])): ?><li><span class="k">Prowadzący</span><span class="v"><?php echo esc_html($ev['prowadzacy']); ?></span></li><?php endif; ?>
					<?php if ($ev['tryb'] === 'STACJONARNE' && !empty($ev['address'])): ?><li><span class="k">Miejsce</span><span class="v"><?php echo esc_html($ev['address']); ?></span></li><?php endif; ?>
				</ul>
			</section>

			<section class="pisil-sec" id="pisil-form">
				<h2>Formularz zgłoszenia</h2>
				<?php
				if ($zapis === 'ok') {
					echo '<div class="pisil-ok"><strong>Zgłoszenie przyjęte.</strong> Potwierdzenie wysłaliśmy e-mailem. Jeśli udział jest płatny, w wiadomości znajdą Państwo dane do przelewu.</div>';
				} elseif ($zapis === 'blad') {
					echo '<div class="pisil-blad">Nie udało się zapisać zgłoszenia. Sprawdź dane (m.in. poprawny NIP i zgodę) i spróbuj ponownie.</div>' . pisil_render_form($ev['slug']);
				} else {
					echo pisil_render_form($ev['slug']);
				}
				?>
			</section>

			<?php if ($ev['tryb'] === 'STACJONARNE' && !empty($ev['address'])): $q = rawurlencode($ev['address']); ?>
				<section class="pisil-sec">
					<h2>Miejsce</h2>
					<p class="pisil-place"><?php echo esc_html($ev['address']); ?></p>
					<div class="pisil-map"><iframe title="Mapa dojazdu" loading="lazy" src="https://maps.google.com/maps?q=<?php echo esc_attr($q); ?>&output=embed"></iframe></div>
				</section>
			<?php endif; ?>
		</div>

		<aside class="pisil-aside">
			<div class="pisil-card">
				<div class="pisil-card__hd">Zapis na wydarzenie</div>
				<div class="pisil-card__bd">
					<?php if ($bezplatne): ?>
						<div class="pisil-price"><span class="lab">Udział</span><span class="val pisil-free">bezpłatny</span></div>
					<?php else: ?>
						<?php if ($konf_gratis): ?>
							<div class="pisil-price"><span class="lab">Członkowie PISiL</span><span class="val pisil-free">bezpłatnie<br><small>do <?php echo intval($ev['pulaGratisNaFirme']); ?> os./firmę</small></span></div>
						<?php elseif ($cenaC > 0): ?>
							<div class="pisil-price"><span class="lab">Członkowie PISiL</span><span class="val"><?php echo esc_html(pisil_pln($cenaC)); ?></span></div>
						<?php endif; ?>
						<?php if ($cenaN > 0): ?>
							<div class="pisil-price"><span class="lab">Pozostali</span><span class="val"><?php echo esc_html(pisil_pln($cenaN)); ?></span></div>
						<?php endif; ?>
					<?php endif; ?>

					<div class="pisil-pills">
						<?php if (isset($ev['dostepneMiejsca']) && $ev['dostepneMiejsca'] !== null): ?><span class="pisil-pill pisil-pill--ok">Wolne miejsca: <?php echo intval($ev['dostepneMiejsca']); ?></span><?php endif; ?>
						<?php if (!empty($ev['registrationDeadline'])): ?><span class="pisil-pill">Zapisy do <?php echo esc_html(pisil_date($ev['registrationDeadline'])); ?></span><?php endif; ?>
					</div>

					<?php /* Status, nie przycisk: formularz jest niżej na tej samej stronie, więc przycisk
					         „Zapisz się” w karcie tylko mylił. Karta ma informować, nie duplikować akcji. */ ?>
					<?php if (!empty($ev['rejestracjaOtwarta'])): ?>
						<div class="pisil-status pisil-status--on">Zapisy trwają</div>
					<?php else: ?>
						<div class="pisil-status pisil-status--off">Rejestracja zakończona</div>
					<?php endif; ?>
					<p class="pisil-note">Członkostwo rozpoznajemy automatycznie po NIP-ie firmy. Po zapisie wysyłamy potwierdzenie e-mailem; dla udziału płatnego — dane do przelewu.</p>
				</div>
			</div>
		</aside>
	</div>
	<?php
	return ob_get_clean();
}

// Rozwijane bloki (toggle) pod każdym wydarzeniem NA LIŚCIE (strony Konferencje / Szkolenia) — odwzorowanie
// wcześniejszych konferencji na pisil.pl (Elementor „nested-accordion"): granatowe belki #0a284f, biały
// tekst, ikona +/− po lewej, cienki separator #d5d8dc. „Informacje" = opis wydarzenia z panelu; pozostałe
// zakładki na razie z tekstem testowym (docelowo załączane z panelu — program, zdjęcia, wideo — tak jak
// wcześniej wrzucała Pani Teresa). Natywne <details>/<summary> → działa bez JavaScriptu.
// Etykiety belek + podpis linku dopasowany do bloku (tak, jak nazywa to strona: „Przejdź do relacji”).
function pisil_acc_def() {
	return array(
		'INFORMACJE' => array('Informacje',    'Więcej informacji'),
		'PROGRAM'    => array('Program',       'Otwórz program'),
		'GALERIA'    => array('Galeria zdjęć', 'Przejdź do galerii'),
		'RELACJA'    => array('Relacja wideo', 'Przejdź do relacji'),
	);
}

// Treść jednego bloku: tekst, plik i link — dowolna kombinacja, każde opcjonalne.
function pisil_sekcja_html($s, $etykieta_linku) {
	$out = '';
	if (!empty($s['tekst'])) {
		$out .= '<p>' . nl2br(esc_html($s['tekst'])) . '</p>';
	}
	if (!empty($s['plikUrl'])) {
		// Panel oddaje ścieżkę względną — plik idzie przez jego trasę, nie przez publiczny adres chmury.
		$nazwa = !empty($s['plikNazwa']) ? $s['plikNazwa'] : 'Pobierz plik';
		$out .= '<p><a class="pisil-acc-plik" href="' . esc_url(PISIL_API . $s['plikUrl']) . '" target="_blank" rel="noopener">' . esc_html($nazwa) . '</a></p>';
	}
	if (!empty($s['link'])) {
		$out .= '<p><a class="pisil-acc-link" href="' . esc_url($s['link']) . '" target="_blank" rel="noopener">' . esc_html($etykieta_linku) . '</a></p>';
	}
	return $out;
}

function pisil_render_accordion($ev) {
	// Bloki uzupełnia Pani Teresa w panelu, gdy treści są gotowe (program przed, galeria i relacja po).
	// Blok bez treści nie przychodzi z API → belka się nie pojawia. Zero pustych belek na stronie.
	$sekcje = array();
	if (!empty($ev['sekcje']) && is_array($ev['sekcje'])) {
		foreach ($ev['sekcje'] as $s) {
			if (!empty($s['klucz'])) $sekcje[$s['klucz']] = $s;
		}
	}

	$items = array();
	foreach (pisil_acc_def() as $klucz => $d) {
		list($tytul, $etykieta_linku) = $d;
		$html = isset($sekcje[$klucz]) ? pisil_sekcja_html($sekcje[$klucz], $etykieta_linku) : '';

		// „Informacje” bez własnej treści pokazują opis wydarzenia — żeby blok nigdy nie był pusty.
		if ($klucz === 'INFORMACJE' && $html === '' && !empty($ev['description'])) {
			$html = '<p>' . nl2br(esc_html($ev['description'])) . '</p>';
		}
		if ($html === '') continue;
		$items[] = array($tytul, $html);
	}
	if (empty($items)) return '';

	ob_start();
	echo '<div class="pisil-acc">';
	foreach ($items as $it) {
		echo '<details class="pisil-acc-item">';
		echo '<summary class="pisil-acc-title"><span class="pisil-acc-ico" aria-hidden="true"></span><span class="pisil-acc-label">' . esc_html($it[0]) . '</span></summary>';
		echo '<div class="pisil-acc-body">' . $it[1] . '</div>';
		echo '</details>';
	}
	echo '</div>';
	return ob_get_clean();
}

function pisil_render_form($slug) {
	ob_start(); ?>
	<form class="pisil-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
		<input type="hidden" name="action" value="pisil_zapis">
		<input type="hidden" name="slug" value="<?php echo esc_attr($slug); ?>">
		<?php wp_nonce_field('pisil_zapis'); ?>
		<div class="pisil-row">
			<label>Imię *<input type="text" name="firstName" required></label>
			<label>Nazwisko *<input type="text" name="lastName" required></label>
		</div>
		<label>E-mail *<input type="email" name="email" required></label>
		<label>Nazwa firmy *<input type="text" name="firmaNazwa" required></label>
		<div class="pisil-row">
			<label>NIP firmy *<input type="text" name="firmaNip" required placeholder="10 cyfr"></label>
			<label>Adres do faktury<input type="text" name="firmaAdres"></label>
		</div>
		<div class="pisil-hp" aria-hidden="true"><label>Nie wypełniaj<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>
		<label class="pisil-consent"><input type="checkbox" name="zgodaRodo" value="1" required> <span>Wyrażam zgodę na przetwarzanie moich danych osobowych przez Polską Izbę Spedycji i Logistyki w celu organizacji i obsługi udziału w wydarzeniu (RODO). *</span></label>
		<button type="submit" class="pisil-btn">Zapisz się</button>
	</form>
	<?php
	return ob_get_clean();
}

/* =========================================================================
 * 5) OBSŁUGA FORMULARZA — pośrednik WP → API panelu
 * =======================================================================*/
add_action('admin_post_nopriv_pisil_zapis', 'pisil_handle_zapis');
add_action('admin_post_pisil_zapis', 'pisil_handle_zapis');
function pisil_handle_zapis() {
	$powrot = wp_get_referer() ?: home_url('/wydarzenia');
	if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'pisil_zapis')) {
		wp_die('Sesja wygasła. Wróć i spróbuj ponownie.');
	}
	if (!empty($_POST['company_website'])) { wp_safe_redirect(add_query_arg('zapis', 'ok', $powrot) . '#pisil-form'); exit; }

	$slug = sanitize_text_field($_POST['slug'] ?? '');
	$res = wp_remote_post(PISIL_API . '/api/public/events/' . rawurlencode($slug) . '/registrations', [
		'headers' => ['Content-Type' => 'application/json'],
		'body' => wp_json_encode([
			'firstName'  => sanitize_text_field($_POST['firstName'] ?? ''),
			'lastName'   => sanitize_text_field($_POST['lastName'] ?? ''),
			'email'      => sanitize_email($_POST['email'] ?? ''),
			'firmaNazwa' => sanitize_text_field($_POST['firmaNazwa'] ?? ''),
			'firmaNip'   => sanitize_text_field($_POST['firmaNip'] ?? ''),
			'firmaAdres' => sanitize_text_field($_POST['firmaAdres'] ?? ''),
			'zgodaRodo'  => !empty($_POST['zgodaRodo']),
		]),
		'timeout' => 12,
	]);
	$code = is_wp_error($res) ? 0 : wp_remote_retrieve_response_code($res);
	$ok = in_array($code, [201, 206], true);
	wp_safe_redirect(add_query_arg('zapis', $ok ? 'ok' : 'blad', $powrot) . '#pisil-form');
	exit;
}

/* =========================================================================
 * 6) STYLE — system wizualny pisil.pl (granat #0a284f, czcionka systemowa)
 * =======================================================================*/
function pisil_style() {
	static $done = false; if ($done) return ''; $done = true;
	return '<style>
	.pisil-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
	.pisil-events{margin:8px 0}
	.pisil-ev{padding:20px 0;border-bottom:1px solid #e4e7ec}
	.pisil-ev:first-child{padding-top:0}
	.pisil-ev:last-child{border-bottom:0}
	.pisil-ev__title{color:#0a284f!important;font-weight:800;font-size:24px;line-height:1.3;margin:0 0 14px}
	.pisil-ev__btn{display:inline-block;margin:0 0 16px;background:#0a284f;color:#fff!important;text-decoration:none;font-weight:700;
		font-size:16px;padding:12px 26px;border-radius:10px;transition:background .15s;line-height:1.2}
	.pisil-ev__btn:hover{background:#14315c;color:#fff!important}
	.pisil-empty{text-align:center;color:#6b7280;padding:2rem 0}

	.pisil-hero{background:#f2f3f5;border-bottom:1px solid #e4e7ec}
	.pisil-hero .pisil-wrap{padding:32px 24px 38px}
	.pisil-crumb{color:#5b6470;font-size:14px;margin-bottom:12px}
	.pisil-crumb a{color:#5b6470;text-decoration:none}.pisil-crumb b{color:#0a284f}
	.pisil-h1{font-family:inherit;color:#0a284f;font-weight:800;font-size:40px;line-height:1.15;margin:0 0 14px;text-wrap:balance}
	.pisil-meta{display:flex;gap:10px;flex-wrap:wrap}
	.pisil-tag{font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;background:#fff;border:1px solid #e4e7ec;color:#0a284f}
	.pisil-tag--navy{background:#0a284f;color:#fff;border-color:#0a284f}

	.pisil-grid{display:grid;grid-template-columns:1fr 360px;gap:44px;padding-top:40px;padding-bottom:56px}
	.pisil-sec{margin-bottom:32px;color:#333}
	.pisil-sec h2{color:#0a284f;font-weight:800;font-size:22px;margin:0 0 14px;padding-bottom:10px;border-bottom:2px solid #e4e7ec}
	.pisil-lead{font-size:17px;color:#2b3340;line-height:1.6}
	.pisil-facts{list-style:none;padding:0;margin:0;display:grid;gap:12px}
	.pisil-facts li{display:grid;grid-template-columns:150px 1fr;gap:12px;padding-bottom:12px;border-bottom:1px solid #e4e7ec}
	.pisil-facts .k{color:#5b6470;font-weight:600}.pisil-facts .v{color:#333;font-weight:600}

	.pisil-aside{align-self:start;position:sticky;top:24px}
	.pisil-card{border:1px solid #e4e7ec;border-radius:10px;overflow:hidden;background:#fff}
	.pisil-card__hd{background:#0a284f;color:#fff;padding:16px 20px;font-weight:800;font-size:16px}
	.pisil-card__bd{padding:20px}
	.pisil-price{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;border-bottom:1px solid #e4e7ec}
	.pisil-price:last-of-type{border-bottom:0}
	.pisil-price .lab{color:#5b6470;font-size:14px}
	.pisil-price .val{font-weight:800;color:#0a284f;text-align:right}
	.pisil-price .val small{font-weight:600;color:#5b6470}
	.pisil-free{color:#0f7a4d}
	.pisil-pills{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px}
	/* Badge informacyjne — jedna, spójna rodzina w kolorach PISiL (miękki granat). */
	.pisil-pill{font-size:13px;padding:5px 12px;border-radius:999px;background:rgba(10,40,79,.08);color:#0a284f;font-weight:600}
	.pisil-pill--ok{background:rgba(10,40,79,.08);color:#0a284f}

	/* Status zapisów w karcie — informuje, nie udaje przycisku (formularz jest niżej na stronie).
	   Aktywny na pełnym granacie z białym tekstem, żeby nie zlewał się z kartą; zakończony wygaszony. */
	.pisil-status{margin-top:16px;text-align:center;padding:13px 16px;border-radius:10px;font-size:16px;font-weight:700}
	.pisil-status--on{background:#0a284f;color:#fff}
	.pisil-status--off{background:#f1f2f4;color:#6b7280}
	.pisil-btn{display:block;width:100%;box-sizing:border-box;text-align:center;background:#0a284f;color:#fff!important;
		border:0;border-radius:10px;padding:14px 24px;font-size:17px;font-weight:700;text-decoration:none;cursor:pointer;margin-top:16px}
	.pisil-btn:hover{background:#14315c}
	.pisil-btn--off{background:#e4e7ec;color:#9aa1ac!important;cursor:default}
	.pisil-note{font-size:13px;color:#5b6470;margin-top:12px;line-height:1.5}

	.pisil-form{display:grid;gap:16px;max-width:640px}
	.pisil-form label{display:grid;gap:6px;font-size:14px;font-weight:600;color:#0a284f}
	.pisil-form input[type=text],.pisil-form input[type=email]{padding:12px 14px;border:1px solid #cbd2dc;border-radius:10px;font-size:15px;color:#333;font-family:inherit}
	.pisil-form input:focus{outline:2px solid #0a284f;outline-offset:1px;border-color:#0a284f}
	.pisil-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
	.pisil-consent{grid-template-columns:20px 1fr;display:grid;align-items:start;gap:12px;font-weight:400;color:#5b6470;font-size:14px}
	.pisil-consent input{margin-top:3px}
	.pisil-hp{position:absolute;left:-9999px}
	.pisil-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:1rem;border-radius:10px}
	.pisil-blad{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:1rem;border-radius:10px;margin-bottom:1rem}
	.pisil-place{color:#5b6470;margin:0 0 10px}
	.pisil-map iframe{width:100%;height:300px;border:0;border-radius:10px}

	.pisil-acc{margin:0}          /* akordeon jest teraz ostatni w bloku — odstęp daje padding .pisil-ev */
	.pisil-acc-item{margin:0}
	.pisil-acc-item+.pisil-acc-item{margin-top:-1px}
	.pisil-acc-title{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;
		background:#0a284f;color:#fff;padding:11px 12px;border:1px solid #d5d8dc;font-size:16px;font-weight:400;line-height:1.4}
	.pisil-acc-title::-webkit-details-marker{display:none}
	.pisil-acc-title::marker{content:""}
	.pisil-acc-title:hover{background:#14315c}
	.pisil-acc-ico{order:-1;flex:0 0 16px;text-align:center;font-weight:700;font-size:18px;line-height:1}
	.pisil-acc-ico::before{content:"+"}
	.pisil-acc-item[open]>.pisil-acc-title .pisil-acc-ico::before{content:"\2212"}
	.pisil-acc-body{padding:16px 18px;background:#fff;border:1px solid #d5d8dc;border-top:0;color:#333;line-height:1.7;font-size:16px}
	.pisil-acc-body p{margin:0 0 10px}.pisil-acc-body p:last-child{margin:0}
	.pisil-acc-plik,.pisil-acc-link{display:inline-block;color:#0a284f;font-weight:700;
		text-decoration:underline;text-underline-offset:3px}
	.pisil-acc-plik:hover,.pisil-acc-link:hover{color:#14315c}

	@media(max-width:900px){
		.pisil-grid{grid-template-columns:1fr;gap:24px}
		.pisil-aside{position:static}
		.pisil-h1{font-size:30px}
		.pisil-row{grid-template-columns:1fr}
		.pisil-facts li{grid-template-columns:120px 1fr}
		.pisil-bar__cta{display:none}
	}
	</style>';
}
