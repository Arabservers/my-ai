<?php
define('GEMINI_API_KEY', 'AIzaSyDO1X1l9v6D6X-RLNfMkQawhETv2mNNVTc');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rateLimitFile = sys_get_temp_dir() . '/turkibot_rate_limit.json';
$maxRequests = 20;
$timeWindow = 60;

function checkRateLimit($file, $maxRequests, $timeWindow)
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $now = time();
    $data = [];

    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?? [];
    }

    if (!isset($data[$ip])) {
        $data[$ip] = [];
    }

    $data[$ip] = array_filter($data[$ip], function ($timestamp) use ($now, $timeWindow) {
        return ($now - $timestamp) < $timeWindow;
    });

    if (count($data[$ip]) >= $maxRequests) {
        return false;
    }

    $data[$ip][] = $now;
    file_put_contents($file, json_encode($data));
    return true;
}

if (!checkRateLimit($rateLimitFile, $maxRequests, $timeWindow)) {
    http_response_code(429);
    echo json_encode(['error' => ['message' => 'تم تجاوز الحد الأقصى للطلبات. حاول مرة أخرى بعد دقيقة.']]);
    exit;
}

$input = file_get_contents('php://input');
$requestData = json_decode($input, true);

if (!$requestData) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'بيانات غير صالحة']]);
    exit;
}

$systemPrompt = 'أنت مساعد ذكاء اصطناعي متخصص في البرمجة وتطوير المواقع اسمك TurkiBot. يمكنك:
1. إنشاء مواقع ويب كاملة باستخدام HTML, CSS, JavaScript
2. كتابة وتحسين الأكواد البرمجية
3. شرح المفاهيم البرمجية
4. حل المشاكل التقنية

عند إنشاء موقع أو كود:
- قم بتضمين الكود كاملاً داخل code blocks مع تحديد اللغة (html, css, javascript)
- اجعل التصاميم عصرية وجميلة باستخدام CSS متقدم
- استخدم ألوان جذابة وتأثيرات حديثة
- اجعل التصميم متجاوب مع جميع الشاشات

رد باللغة العربية دائماً إلا إذا طُلب منك غير ذلك.';

$apiRequest = [
    'system_instruction' => [
        'parts' => [['text' => $systemPrompt]]
    ],
    'contents' => $requestData['contents'] ?? [],
    'generationConfig' => [
        'temperature' => 0.7,
        'topK' => 40,
        'topP' => 0.95,
        'maxOutputTokens' => 8192
    ]
];

$ch = curl_init(GEMINI_API_URL . '?key=' . GEMINI_API_KEY);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($apiRequest),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 60
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'خطأ في الاتصال: ' . $error]]);
    exit;
}

http_response_code($httpCode);
echo $response;
