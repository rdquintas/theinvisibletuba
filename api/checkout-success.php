<?php
$lang = (isset($_GET['lang']) && $_GET['lang'] === 'en') ? 'en' : 'pt';
$sessionId = isset($_GET['session_id']) ? $_GET['session_id'] : '';

$copy = [
    'pt' => [
        'title' => 'Obrigado pela tua compra! 😁',
        'body' => 'O teu pagamento foi confirmado. Vais receber um email com os detalhes da encomenda em breve.',
        'back' => 'Voltar à Loja',
        'home' => 'Página Inicial',
    ],
    'en' => [
        'title' => 'Thank you for your order! 😁',
        'body' => 'Your payment has been confirmed. You will receive an email with your order details shortly.',
        'back' => 'Back to Shop',
        'home' => 'Home',
    ],
];
$c = $copy[$lang];
$shopHref = $lang === 'en' ? '../shop_en.html' : '../shop.html';
$homeHref = $lang === 'en' ? '../index_en.html' : '../index.html';
?>
<!doctype html>
<html lang="<?php echo $lang; ?>">
<head>
    <meta charset="utf-8" />
    <title>The Invisible Tuba — <?php echo htmlspecialchars($c['title']); ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="../assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" media="all" />
    <link href="../assets/css/main.min.css" rel="stylesheet" type="text/css" media="all" />
    <link href="../assets/css/zrq.css" rel="stylesheet" type="text/css" media="all" />
    <style>
        body { background: #252525; }
        .zrq-order-status { max-width: 520px; margin: 90px auto; padding: 50px 40px; background: #fff; text-align: center; }
        .zrq-order-status img { width: 90px; margin-bottom: 20px; }
        .zrq-order-status h1 { font-size: 22px; margin-bottom: 16px; }
        .zrq-order-status p { color: #666; margin-bottom: 28px; }
        .zrq-order-status .btn { border: 3px solid #252525; padding: 10px 24px; margin: 0 6px; display: inline-block; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: .5px; color: #252525; }
        .zrq-order-status .btn:hover { background: #af8c45; border-color: #af8c45; color: #fff; }
    </style>
</head>
<body>
    <div class="zrq-order-status">
        <img src="../assets/img/logo_transp_v00.png" alt="The Invisible Tuba" />
        <h1><?php echo htmlspecialchars($c['title']); ?></h1>
        <p><?php echo htmlspecialchars($c['body']); ?></p>
        <a class="btn" href="<?php echo $shopHref; ?>"><?php echo htmlspecialchars($c['back']); ?></a>
        <a class="btn" href="<?php echo $homeHref; ?>"><?php echo htmlspecialchars($c['home']); ?></a>
    </div>
    <script>
        try { localStorage.removeItem('tib_shop_cart'); } catch (e) {}
    </script>
</body>
</html>
