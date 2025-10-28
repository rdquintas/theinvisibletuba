<?php 
require_once '../../lib/swift_required.php';

$transport = Swift_SmtpTransport::newInstance('mail.theinvisibletuba.com', 25)
->setUsername('info@theinvisibletuba.com')
->setPassword('yyyy');

$mailer = Swift_Mailer::newInstance($transport);

$form = new stdClass();

$form->language = $_POST["language"];

if ($form->language == "en") {
    $subjectForTuba = "Request for Quote";
    $subjectConfirmation = "Confirmation Message";
} else {
    $subjectForTuba = "Pedido de Orçamento";
    $subjectConfirmation = "Confirmação de Pedido";
}

$form->tag = $_POST["tag"];
$form->name = $_POST["name"];
$form->email = $_POST["email"];
$form->event_type = $_POST["event_type"];
$form->event_occasion = $_POST["event_occasion"];
$form->event_date = $_POST["event_date"];
$form->event_env = $_POST["event_env"];
$form->duration = $_POST["duration"];
$form->event_location = $_POST["event_location"];
$form->guests = $_POST["guests"];
$form->text = $_POST["text"];
$form->promo_code = $_POST["promo_code"];


if (isset($_POST["newsletter"])) {
    $form->newsletter = "SIM";
} else {
    $form->newsletter = "NÃO";
}


// print_r($form);

$body = prepareBody($form);

echo($body);

$messageForTuba = createMessage($form->email, 'info@theinvisibletuba.com', $subjectForTuba, $body);
$messageForCustomer = createMessage('info@theinvisibletuba.com', $form->email, $subjectConfirmation, $body);

if ($mailer->send($messageForTuba) and $mailer->send($messageForCustomer)) {
    if ($form->language == "en") {
        header('Location: thankyou_en.html');        
    } else {
        header('Location: thankyou.html');
    }    
    exit();
} else {
  echo "Failed\n";
}

function createMessage($from, $to, $subject, $body) {    
    $message = Swift_Message::newInstance($subject)
    ->setFrom(array($from))
    ->setTo(array($to))
    ->setBody($body);

    return $message;
}
  

function prepareBody($form) {    
    if ($form->language == "EN") {
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
        $body .= "/The Invisible Tuba" . "\r\n\r\n\r\n\r\n\r\n";  ;
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
        $body .= "/The Invisible Tuba" . "\r\n\r\n\r\n\r\n\r\n";  ;
        $body .= $form->tag . "\r\n";    
    }
   
    return $body;
}

?>