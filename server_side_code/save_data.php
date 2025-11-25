<?php
// ----------------------
// CORS headers
// ----------------------
// Allow any origin (you can restrict later to Qualtrics domain if needed)
// TODO: Uncomment the following lines if CORS is required
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ----------------------
// VALIDATE INPUT
// ----------------------
if (!isset($_POST['exp_data']) || !isset($_POST['file_name']) || !isset($_POST['data_dir'])) {
    http_response_code(400);
    echo "Missing parameters";
    error_log("Missing parameters: " . print_r($_POST, true));
    exit;
}

$exp_data = $_POST['exp_data'];
$file_name = basename($_POST['file_name']);      // sanitize filename
$data_dir = rtrim($_POST['data_dir'], '/');      // remove trailing slash if present

// ----------------------
// ENSURE DIRECTORY EXISTS
// ----------------------
if (!is_dir($data_dir)) {
    if (!mkdir($data_dir, 0777, true)) {
        error_log("Failed to create data directory: $data_dir");
        http_response_code(500);
        echo "Server error: cannot create data directory";
        exit;
    }
}

// ----------------------
// ENSURE DIRECTORY IS WRITABLE
// ----------------------
if (!is_writable($data_dir)) {
    error_log("Data directory NOT writable: $data_dir");
    http_response_code(500);
    echo "Server error: data directory not writable";
    exit;
}

// ----------------------
// SAVE FILE
// ----------------------
$full_path = $data_dir . '/' . $file_name;
$result = file_put_contents($full_path, $exp_data);

if ($result === false) {
    error_log("FAILED TO WRITE FILE: $full_path");
    http_response_code(500);
    echo "Server error: failed to save data";
    exit;
}

echo "Data saved OK";
exit;
?>
