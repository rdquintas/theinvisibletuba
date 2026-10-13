<?php
require_once '../../lib/swift_required.php';

// Dados SMTP: forms/config.php (fora do git, modelo em config.example.php);
// sem esse ficheiro usa os valores de sempre
$smtp = array(
    'host' => 'mail.theinvisibletuba.com',
    'port' => 25,
    'user' => 'info@theinvisibletuba.com',
    'password' => 'yyyy',
);
if (file_exists(__DIR__ . '/config.php')) {
    $smtp = array_merge($smtp, require __DIR__ . '/config.php');
}
$emailTuba = 'info@theinvisibletuba.com';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: get_quote.html');
    exit();
}

$form = new stdClass();

// o formulário PT envia "PT" e o EN envia "EN"
$form->language = strtolower(campo('language', 2)) === 'en' ? 'en' : 'pt';

if ($form->language == "en") {
    $subjectForTuba = "Request for Quote";
    $subjectConfirmation = "Confirmation Message";
    $thankyou = 'thankyou_en.html';
} else {
    $subjectForTuba = "Pedido de Orçamento";
    $subjectConfirmation = "Confirmação de Pedido";
    $thankyou = 'thankyou.html';
}

// Anti-spam: o campo "website" está escondido (só os bots o preenchem) e
// "check" é preenchido pelo javascript do formulário com a hora a que a
// página abriu. Aos bots responde-se como se tudo tivesse corrido bem.
$check = (int) campo('check', 20);
$segundos = time() - intdiv($check, 1000);
if (campo('website', 200) !== '' || $check <= 0 || $segundos < 3 || $segundos > 86400) {
    header('Location: ' . $thankyou);
    exit();
}

$form->tag = campo('tag', 100);
$form->name = campo('name', 100);
$form->email = campo('email', 200);
$form->event_type = campo('event_type', 100);
$form->event_occasion = campo('event_occasion', 200);
$form->event_date = campo('event_date', 100);
$form->event_env = campo('event_env', 50);
$form->duration = campo('duration', 100);
$form->event_location = campo('event_location', 200);
$form->guests = campo('guests', 50);
$form->text = campo('text', 3000);
$form->promo_code = campo('promo_code', 50);

if (isset($_POST["newsletter"])) {
    $form->newsletter = "SIM";
} else {
    $form->newsletter = "NÃO";
}

// validação no servidor (o browser já valida, isto apanha pedidos feitos à mão);
// um link no nome é sinal de spam (o nome vai no email de confirmação)
if ($form->name === '' || !filter_var($form->email, FILTER_VALIDATE_EMAIL)
    || preg_match('#https?://|www\.|<|>#i', $form->name)) {
    http_response_code(400);
    if ($form->language == "en") {
        echo 'Please fill in your name and a valid email. <a href="javascript:history.back()">Go back</a>';
    } else {
        echo 'Por favor preenche o nome e um email válido. <a href="javascript:history.back()">Voltar</a>';
    }
    exit();
}

$transport = Swift_SmtpTransport::newInstance($smtp['host'], $smtp['port'])
->setUsername($smtp['user'])
->setPassword($smtp['password']);

$mailer = Swift_Mailer::newInstance($transport);

$body = prepareBody($form);

// Os dois emails saem sempre de info@ (um "From" com o email do cliente é
// rejeitado por SPF/DMARC); no nosso, "Responder" vai para o cliente
$messageForTuba = createMessage($emailTuba, $emailTuba, $subjectForTuba, $body, $form->email);
$messageForCustomer = createMessage($emailTuba, $form->email, $subjectConfirmation, $body);

if ($mailer->send($messageForTuba) and $mailer->send($messageForCustomer)) {
    header('Location: ' . $thankyou);
    exit();
} else {
  echo "Failed\n";
}

// valor de um campo do formulário, sem espaços nas pontas e com tamanho máximo
function campo($nome, $max) {
    $valor = isset($_POST[$nome]) && is_string($_POST[$nome]) ? trim($_POST[$nome]) : '';
    return mb_substr($valor, 0, $max, 'UTF-8');
}

function createMessage($from, $to, $subject, $body, $replyTo = null) {
    $message = Swift_Message::newInstance($subject)
    ->setFrom(array($from => 'The Invisible Tuba'))
    ->setTo(array($to))
    ->setBody($body);

    if ($replyTo) {
        $message->setReplyTo(array($replyTo));
    }

    return $message;
}


function prepareBody($form) {
    $body = '';
    if ($form->language == "en") {
        $body .= "Hi " . $form->name . ",\r\n";
        $body .= "Thank you for your request, we'll get back to you as soon as possible and we'll send you a detailled offer to your email." . "\r\n\r\n";
        $body .= "Here's the confirmation of your request:" . "\r\n";
        $body .= "=============" . "\r\n";
        $body .= "NAME: " . $form->name . "\r\n";
        $body .= "EMAIL: " . $form->email . "\r\n";
        $body .= "NR. GUESTS: " . $form->guests . "\r\n";
      //  $body .= "EVENT TYPE: " . $form->event_type . "\r\n";
        $body .= "EVENT ENVIRONMENT: " . $form->event_env . "\r\n";
        $body .= "EVENT OCCASION: " . $form->event_occasion . "\r\n";
        $body .= "EVENT LOCATION: " . $form->event_location . "\r\n";
        $body .= "EVENT DATE: " . $form->event_date . "\r\n";
        $body .= "DURATION: " . $form->duration . "\r\n";
        $body .= "PROMO CODE: " . $form->promo_code . "\r\n";
        $body .= "NEWSLETTER: " . $form->newsletter . "\r\n";
        $body .= "OTHER DETAILS: " . $form->text . "\r\n";
        $body .= "=============" . "\r\n";
        $body .= "\r\n\r\n" . "Many Thanks ;o)" . "\r\n\r\n";
        $body .= "/The Invisible Tuba" . "\r\n\r\n\r\n\r\n\r\n";
        $body .= $form->tag . "\r\n";
    } else {
        $body .= "Olá " . $form->name . ",\r\n";
        $body .= "Obrigado pelo teu pedido, entraremos em contacto contigo o mais rápido possível e enviaremos uma proposta de orçamento para o teu email." . "\r\n\r\n";
        $body .= "Sumário do pedido efectuado:" . "\r\n";
        $body .= "=============" . "\r\n";
        $body .= "NAME: " . $form->name . "\r\n";
        $body .= "EMAIL: " . $form->email . "\r\n";
        $body .= "NR. CONVIDADOS: " . $form->guests . "\r\n";
       // $body .= "TIPO DE EVENTO: " . $form->event_type . "\r\n";
        $body .= "AR-LIVRE OU INTERIOR: " . $form->event_env . "\r\n";
        $body .= "MOTIVO FESTA: " . $form->event_occasion . "\r\n";
        $body .= "LOCAL: " . $form->event_location . "\r\n";
        $body .= "DATA: " . $form->event_date . "\r\n";
        $body .= "DURAÇÃO: " . $form->duration . "\r\n";
        $body .= "PROMO CODE: " . $form->promo_code . "\r\n";
        $body .= "NEWSLETTER: " . $form->newsletter . "\r\n";
        $body .= "OUTROS DETALHES: " . $form->text . "\r\n";
        $body .= "=============" . "\r\n";
        $body .= "\r\n\r\n" . "Muito Obrigado ;o)" . "\r\n\r\n";
        $body .= "/The Invisible Tuba" . "\r\n\r\n\r\n\r\n\r\n";
        $body .= $form->tag . "\r\n";
    }

    return $body;
}

?>
