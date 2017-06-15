FPF_COPY = {};

FPF_COPY.copy_table = function () {
	var _button = $(this);
	
	var _table = $($(this).data("copy-table"));
	var _tr_coll = _table.find("tr");
	
	var _text = "";
	for (var _r = 0; _r < _tr_coll.length; _r++) {
		if (_r > 0) {
			_text = _text + "\n";
		}
		
		var _tr = _tr_coll.eq(_r);
		var _td_coll = _tr.find("td");
		if (_td_coll.length === 0) {
			_td_coll = _tr.find("th");
		}
		for (var _c = 0; _c < _td_coll.length; _c++) {
			var _td = _td_coll.eq(_c);
			var _value = _td.text();
			
			if (_c > 0) {
				_text = _text + "\t";
			}
			_text = _text + _value.trim();
		}
	}
	
	FPF_COPY.copy_to_clipboard(_text);
};

FPF_COPY.copy_csv_table = function () {
    var _selector = $(this).attr("copy_selector");

    var _text = $(_selector).val().replace(/,/g, "\t");

    FPF_COPY.copy_to_clipboard(_text);
};

FPF_COPY.copy_to_clipboard = function(_content) {
	//console.log(_content);
	var _button = $('<button type="button" id="clipboard_button"></button>')
		.attr("data-clipboard-text", _content)
		.hide()
		.appendTo("body");
		
	var clipboard = new Clipboard('#clipboard_button');
	
	_button.click();
	_button.remove();
};
