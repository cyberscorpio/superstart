<?php

$d = dir("./components");
$sdk_dir = "../../xulrunner/xulrunner-sdk/";

$xpidl = 'python ' . $sdk_dir . "sdk/bin/typelib.py --cachedir=" . sys_get_temp_dir();
$cmd = $xpidl . " -I " . $sdk_dir . "idl";
while (false !== ($entry = $d->read())) {
	if (strrpos($entry, '.idl') === (strlen($entry) - 4)) {
		$basename = substr($entry, 0, strlen($entry) - 4);

		$idl = "./components/" . $entry;
		$xpt = "./components/" . $basename . '.xpt';

		$midl = @filemtime($idl);
		$mxpt = @filemtime($xpt);
		if ($mxpt !== FALSE && $mxpt > $midl) {
			continue;
		}

		$c = $cmd . ' ' . $idl . ' -o ' . $xpt;
		$c = str_replace('/', DIRECTORY_SEPARATOR, $c);
		// print($c);
		system($c, $retval);
		if ($retval != 0) {
			echo 'process components/' . $entry . ' failed with ' . $retval . "\n";
		} else {
			// system("move {$basename}.xpt components");
			echo "process {$entry} success!" . "\n";
		}
	}
}



?>

