<?php

// A list of permitted file extensions
$allowed = array('png', 'jpg');

if(isset($_FILES['upl']) && $_FILES['upl']['error'] == 0){

	$extension = pathinfo($_FILES['upl']['name'], PATHINFO_EXTENSION);

	if(!in_array(strtolower($extension), $allowed)){
		echo '{"status":"error"}';
		exit;
	}

	if(move_uploaded_file($_FILES['upl']['tmp_name'], '../audiogram/settings/backgrounds/'.date("ymd_His").".".$extension)){
		echo date("ymd_His") . "." . $extension;
// 		echo json_encode($status);
		exit;
	}
}

echo "error";
// 		echo json_encode($status);
exit;