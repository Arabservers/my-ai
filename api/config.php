<?php
define('GEMINI_API_KEY', 'AIzaSyDO1X1l9v6D6X-RLNfMkQawhETv2mNNVTc');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

function getApiKey()
{
    return GEMINI_API_KEY;
}

function getApiUrl()
{
    return GEMINI_API_URL;
}
