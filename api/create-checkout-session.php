<?php
/**
 * Creates a Stripe Checkout Session for the current cart and returns
 * its URL so the browser can redirect the shopper to Stripe's hosted
 * payment page. Prices are always looked up server-side from
 * shop.json — the client only sends product ids + quantities — so a
 * tampered request can never buy something below its real price.
 */

header('Content-Type: application/json');

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Shop is not configured yet.']);
    exit;
}
$config = require $configFile;

if (empty($config['stripe_secret_key']) || strpos($config['stripe_secret_key'], 'REPLACE_ME') !== false) {
    http_response_code(500);
    echo json_encode(['error' => 'Stripe is not configured yet.']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body) || empty($body['items']) || !is_array($body['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid cart']);
    exit;
}

$lang = (isset($body['lang']) && $body['lang'] === 'en') ? 'en' : 'pt';

$catalogFile = __DIR__ . '/../shop.json';
$catalog = json_decode(file_get_contents($catalogFile), true);
$productsById = [];
foreach (($catalog['products'] ?? []) as $product) {
    $productsById[$product['id']] = $product;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'theinvisibletuba.com';
$siteBase = $scheme . '://' . $host . '/';

$fields = [
    'mode' => 'payment',
    'success_url' => $config['success_url'] . '?session_id={CHECKOUT_SESSION_ID}&lang=' . $lang,
    'cancel_url' => $config['cancel_url'] . '?lang=' . $lang,
];

$lineIndex = 0;
foreach ($body['items'] as $item) {
    $id = is_array($item) && isset($item['id']) ? (string) $item['id'] : null;
    $qty = is_array($item) && isset($item['qty']) ? max(1, (int) $item['qty']) : 1;

    if ($id === null || !isset($productsById[$id])) {
        continue;
    }

    $product = $productsById[$id];
    $text = $product[$lang] ?? $product['pt'] ?? [];
    $title = $text['title'] ?? $product['id'];

    $prefix = "line_items[$lineIndex]";
    $fields[$prefix . '[quantity]'] = $qty;
    $fields[$prefix . '[price_data][currency]'] = $config['currency'];
    $fields[$prefix . '[price_data][unit_amount]'] = (int) round(((float) $product['price']) * 100);
    $fields[$prefix . '[price_data][product_data][name]'] = $title;

    if (!empty($product['images'][0])) {
        $image = $product['images'][0];
        $isAbsolute = preg_match('#^https?://#i', $image) === 1;
        $fields[$prefix . '[price_data][product_data][images][0]'] = $isAbsolute ? $image : $siteBase . ltrim($image, '/');
    }

    $lineIndex++;
}

if ($lineIndex === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Cart is empty or contains invalid items']);
    exit;
}

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($fields),
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $config['stripe_secret_key'],
    ],
    CURLOPT_TIMEOUT => 15,
]);
$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach Stripe: ' . $curlError]);
    exit;
}

$session = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300 && !empty($session['url'])) {
    echo json_encode(['url' => $session['url']]);
} else {
    http_response_code(502);
    echo json_encode(['error' => $session['error']['message'] ?? 'Stripe error']);
}
