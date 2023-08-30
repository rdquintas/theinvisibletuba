<?php 

// if (isset($_POST['submit'])) {
    $to = "rdquintas@yahoo.com";
    //$_POST['email']; 
    $subject = "zrqSubject";
    $message = "zrqMessage"; //getRequestURI();
    $from = "rdquintas@yahoo.com";
    $headers = "From:" . $from;

    if (mail($to, $subject, $message, $headers)) {
        echo "Mail Sent.";
    }
    else {
        echo "failed";
    }
// }

?>