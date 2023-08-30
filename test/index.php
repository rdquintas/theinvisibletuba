<?php 


// inclusão da framework no código
require_once '../lib/swift_required.php';

// definir a autenticação via SMTP
// mail.dominios.pt -> deverá trocar pelo endereço de e-mail do seu domínio
// webmaster@dominio.tld -> deverá trocar pelo seu endereço de e-mail
// password_caixa_email -> deverá preencher com a password da respectiva caixa
$transport = Swift_SmtpTransport::newInstance('mail.theinvisibletuba.com', 25)
->setUsername('info@theinvisibletuba.com')
->setPassword('#uUcpSANQqA5')
;
$mailer = Swift_Mailer::newInstance($transport);
 
// Criar o cabeçalho, assim como a mensagem
$message = Swift_Message::newInstance('Assunto email')
->setFrom(array('info@theinvisibletuba.com' => 'webmaster'))
->setTo(array('rdquintas@yahoo.com'))
->setBody('Corpo da mensagem')
;
// Efectuar o envio
$result = $mailer->send($message);

// // if (isset($_POST['submit'])) {
//     $to = "rdquintas@yahoo.com";
//     //$_POST['email']; 
//     $subject = "zrqSubject";
//     $message = "zrqMessage"; //getRequestURI();
//     $from = "info@theinvisibletuba.com";
//     $headers = "From:" . $from;

//     if (mail($to, $subject, $message, $headers)) {
//         echo "Mail Sent.";
//     }
//     else {
//         echo "failed 1707";
//     }
// // }

?>