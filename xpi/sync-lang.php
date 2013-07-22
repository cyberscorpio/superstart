<?php
	$srclang = 'en-US';
	$srcdir = dir('chrome/locale/' . $srclang . '/');


	$src = array();
	while ($filename = $srcdir->read()) {
		if ($filename == '.' || $filename == '..' || $filename[0] == '.') {
			continue;
		}

		$pathname = $srcdir->path . $filename;
		$src[$filename] = load($pathname);
	}

	// print_r($src);


	$localedir = dir('chrome/locale/');
	while($lang = $localedir->read()) {
		if ($lang == '.' || $lang == '..' || $lang[0] == '.') {// || $lang == $srclang) {
			continue;
		}

		$langpath = $localedir->path . $lang;
		if (!is_dir($langpath )) {
			continue;
		}

		echo "Processing {$lang}\n";
		foreach($src as $filename => $value) {
			$dstpath = $langpath . '/' . $filename;
			if (!file_exists($dstpath)) {
				echo "...{$filename} doesn't exist, just copy it from {$srcdir->path}...";
				copy($value['pathname'], $dstpath);
				echo "success!\n";
			} else {
				$dtd = true;
				if ($value['type'] != 'dtd') {
					$dtd = false;
				}
				$lines = $value['lines'];

				$v = load($dstpath);
				$dict = $v['dict'];

				$text = '';
				$nl = '';
				for ($i = 0; $i < count($lines); ++ $i) {
					$text = $text . $nl;
					$l = $lines[$i];
					$t = $l['type'];
					if ($t == 'empty') {

					} else if ($t == 'comment') {
						$text = $text . $l['data'];
					} else if ($t == 'data') {
						$k = $l['key'];
						$v = $l['value'];
						if (isset($dict[$k])) {
							$v = $dict[$k];
						} else {
							echo "...{$k} is missing, use the default value: {$v}\n";
						}
						if ($dtd) {
							$text = $text . '<!ENTITY ' . $k . ' "' . $v . '">';
						} else {
							$text = $text . $k . '=' . $v;
						}
					}

					$nl = "\n";
				}

				echo "...write the data back to {$filename}...";
				file_put_contents($dstpath, $text);
				echo "success!\n";
			}
		}
	}






	function load($pathname) {
		if (strrpos($pathname, '.dtd') == strlen($pathname) - 4) {
			return load_dtd($pathname);
		} else {
			return load_properties($pathname);
		}
	}

	function load_dtd($pathname) {
		$text = file_get_contents($pathname);
		$text = str_replace("\r", '', $text);
		$value = array();
		$value['pathname'] = $pathname;
		$value['type'] = 'dtd';
		$lines = array();
		$dict = array();

		$ls = explode("\n", $text);
		for ($i = 0; $i < count($ls); ++ $i) {
			$l = $ls[$i];

			if (preg_match('/^( |\t)*$/u', $l) != 0) {
				$emptyline = array(
						'type'=> 'empty',
						'data'=> $l
						);
				array_push($lines, $emptyline);
				continue;
			}

			if (preg_match('/^.*<!--.*-->.*$/u', $l) != 0) {
				$comment = array(
						'type'=> 'comment',
						'data'=> $l
						);
				array_push($lines, $comment);
				continue;
			}

			$matches = array();
			if (preg_match('/^.*<!ENTITY[ \t]+([^ \t]+)[ \t]+"([^"]+)">.*$/u', $l, $matches) == 0) {
				echo "BAD format: " . $l . "\n";
				exit;
			}
			$data = array(
					'type'=> 'data',
					'key'=> $matches[1],
					'value'=> $matches[2]
				     );
			array_push($lines, $data);

			$dict[$matches[1]] = $matches[2];
		}

		$value['lines'] = $lines;
		$value['dict'] = $dict;

		return $value;
	}

	function load_properties($pathname) {
		$text = file_get_contents($pathname);
		$text = str_replace("\r", '', $text);
		$value = array();
		$value['pathname'] = $pathname;
		$value['type'] = 'properties';
		$lines = array();
		$dict = array();

		$ls = explode("\n", $text);
		for ($i = 0; $i < count($ls); ++ $i) {
			$l = $ls[$i];

			if (preg_match('/^( |\t)*$/u', $l) != 0) {
				$emptyline = array(
						'type'=> 'empty',
						'data'=> $l
						);
				array_push($lines, $emptyline);
				continue;
			}

			$matches = array();
			if (preg_match('/^([^=]+)=(.+)$/u', $l, $matches) == 0) {
				echo "BAD format: " . $l . "\n";
				exit;
			}
			$data = array(
					'type'=> 'data',
					'key'=> $matches[1],
					'value'=> $matches[2]
				     );
			array_push($lines, $data);

			$dict[$matches[1]] = $matches[2];
		}

		$value['lines'] = $lines;
		$value['dict'] = $dict;

		return $value;
	}
?>
