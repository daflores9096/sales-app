<?php
$servername = "db";
$username = "app_user";
$password = "app_password";
$dbname = "app_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
  die("Error de conexión: " . $conn->connect_error);
}
echo "<h1>Conexión exitosa a la base de datos 🎉</h1>";
$conn->close();
?>
