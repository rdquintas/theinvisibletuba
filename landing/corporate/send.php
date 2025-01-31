<?php
require_once '../../../lib/swift_required.php';

$transport = Swift_SmtpTransport::newInstance('mail.theinvisibletuba.com', 25)
    ->setUsername('info@theinvisibletuba.com')
    ->setPassword('yyyy');

$mailer = Swift_Mailer::newInstance($transport);

$form = new stdClass();


$subjectForTuba = "Pedido de Informação";
$subjectConfirmation = "Pedido de Informação";
$form->nome = $_POST["nome"];
$form->email = $_POST["email"];
$form->empresa = $_POST["empresa"];
$form->mensagem = $_POST["mensagem"];
$form->newsletter_cb = $_POST["newsletter_cb"];

if ($form->newsletter_cb == "true") {
    $form->newsletter_cb = "sim";
} else {
    $form->newsletter_cb = "não";
}

$body = prepareBody($form);

$messageForTuba = createMessage($form->email, 'info@theinvisibletuba.com', $subjectForTuba, $body);
$messageForCustomer = createMessage('info@theinvisibletuba.com', $form->email, $subjectConfirmation, $body);

if ($mailer->send($messageForTuba) and $mailer->send($messageForCustomer)) {
    //header('Location: thankyou.html');
    header('Content-Type:application/json; charset=UTF-8');
    echo json_encode($form);
    exit();
}

function createMessage($from, $to, $subject, $body)
{
    $message = Swift_Message::newInstance($subject)
        ->setFrom(array($from))
        ->setTo(array($to))
        ->setBody($body);
    return $message;
}


function prepareBody($form)
{
    $body = "";
    $body .= "Olá " . $form->nome . ",\r\n";
    $body .= "Obrigado pela tua mensagem, entraremos em contacto contigo o mais rápido possível." . "\r\n\r\n";
    $body .= "Sumário da mensagem recebida:" . "\r\n";
    $body .= "=============" . "\r\n";
    $body .= "NOME: " . $form->nome . "\r\n";
    $body .= "EMAIL: " . $form->email . "\r\n";
    $body .= "EMPRESA: " . $form->empresa . "\r\n";
    $body .= "MENSAGEM: " . $form->mensagem . "\r\n";
    $body .= "RECEBER NEWSLETTER: " . $form->newsletter_cb . "\r\n";
    $body .= "=============" . "\r\n";
    $body .= "\r\n\r\n" . "Muito Obrigado ;o)" . "\r\n\r\n";
    $body .= "/The Invisible Tuba" . "\r\n";
    $body .= "Ricardo Quintas | T: 967 285 043";
    return $body;
}
