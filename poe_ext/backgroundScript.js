function copy(str) {
	var sandbox = $('#tmp-clipboard').val(str).select();
	document.execCommand('copy');
	sandbox.val('');
}

function paste() {
	var result = '', sandbox = $('#tmp-clipboard').val('').select();
	if (document.execCommand('paste')) {
		result = sandbox.val();
	}
	sandbox.val('');
	return result;
}