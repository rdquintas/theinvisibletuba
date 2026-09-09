<?php
/**
 * Stripe / shop configuration template.
 *
 * Copy this file to "config.php" (same folder), fill in the real
 * values and NEVER commit config.php — it is listed in .gitignore
 * on purpose because it holds a secret API key.
 */
return [
    // Secret key from https://dashboard.stripe.com/apikeys
    // Use a sk_test_... key while developing, sk_live_... in production.
    'stripe_secret_key' => 'sk_test_REPLACE_ME',

    // ISO currency code understood by Stripe (lowercase).
    'currency' => 'eur',

    // Where Stripe sends the shopper back to after payment.
    // {CHECKOUT_SESSION_ID} is filled in by Stripe itself.
    'success_url' => 'https://theinvisibletuba.com/api/checkout-success.php',
    'cancel_url'  => 'https://theinvisibletuba.com/api/checkout-cancel.php',
];
