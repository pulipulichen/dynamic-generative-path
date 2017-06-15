var _process_file = function(_profile_csv, _sequence_csv, _callback) {
    _loading_enable(function () {
    
    var _result = "";
    
    // ---------------------------------------
    // 將CSV轉換成JSON
    var _profile = _parse_profile(_profile_csv);
    //console.log(_profile);
    var _sequence = _parse_sequence(_sequence_csv);
    //console.log(_sequence);
    
    // -----------------------------------
    // 準備模型所需的資料
    var _lag_config = parseInt($("#lag_config").val(), 10);
    //console.log(_lag_config);
    
    // 建立lag資料
    var _lag_data_json = _build_lag_data(_profile, _sequence, _lag_config);
    var _lag_data = _lag_data_json.lag_data;
    var _class_data = _lag_data_json.class_data;
    //console.log(_lag_data);
    console.log(_class_data);
    
    
    var _cat_dict = _build_lag_dict(_lag_data);
    //console.log(_cat_dict);
    var _cat_rdict = _reverse_dict(_cat_dict);
    //console.log(_cat_rdict);
    
    // 試著建立資料看看
    /*
    // dummy variables
    var _t = _create_cat_feature({
        "lag0_GL": "GL5_5",
        "lag0_URL": "/zh-tw"
    }, _cat_rdict);
    console.log(_t);
    */
    
    var _numeric_lag_data = [];
    for (var _i = 0; _i < _lag_data.length; _i++) {
        var _d = _create_cat_feature(_lag_data[_i], _cat_rdict);
        _numeric_lag_data.push(_d);
    }
    //console.log(_numeric_lag_data);
    
    // ------------------------------------
    // 建立類神經網路
    //var _model = _build_mlp_model(_numeric_lag_data, _class_data);
    // 建立隨機模型
    var _model = _build_random_model(_numeric_lag_data, _class_data);
    
    // -----------------------------------
    // 準備生成路徑所需的資料
    var _start_points = _parse_start_points(_sequence);
    console.log(_start_points);
    var _end_points = _parse_end_points(_sequence);
    console.log(_end_points);
    
    var _next_points = _parse_next_points(_sequence);
    console.log(_next_points);
    //return;
    
    // ------------------------------------
    // 開始進行生成
    var _path_sum = 0;
    for (var _i = 0; _i < 100; _i++) {
        var _path = _start_generative_path(_start_points
            , _end_points
            , _next_points
            , _lag_config
            , _cat_rdict
            , _model);
        _path_sum += _path.length;
    }
    console.log(["平均完成步數", (_path_sum/100)]);
    //console.log(_path);
    
    _result = _path.join("\n");
    _result = "總共" + _path.length + "步\n" + _result;
    
    // --------------------------
    // 完成
    _loading_disable();
    if (typeof (_callback) === "function") {
        _callback(_result);
    }
    
    }); // _loading_enable(function () {
};

// ---------------------

var _parse_profile = function (_profile_csv) {
    var _profile = {};
    _csv_each(_profile_csv, function (_row) {
        var _user = _row[0].value;
        _profile[_user] = {};
        for (var _r = 1; _r < _row.length; _r++) {
            _profile[_user][_row[_r].key] = _row[_r].value;
        }
    });
    return _profile;
};

var _parse_sequence = function (_sequence_csv) {
    var _sequence = {};
    _csv_each(_sequence_csv, function (_row) {
        var _user = _row[0].value;
        if (typeof(_sequence[_user]) === "undefined") {
            _sequence[_user] = [];
        }
        
        var _seq = {};
        var _time = _row[1].value;
        _seq["time"] = _time;
        
        for (var _r = 2; _r < _row.length; _r++) {
            _seq[_row[_r].key] = _row[_r].value;
        }
        
        _sequence[_user].push(_seq);
    });
    
    // 排序
    for (var _user in _sequence) {
        _sequence[_user].sort(function (_a, _b) {
            return (_a.time - _b.time);
        });
    }
    
    return _sequence;
};

var _csv_each = function (_csv, _process) {
    var _lines = _csv.trim().split("\n");
    var _keys = [];
    for (var _i = 0; _i < _lines.length; _i++) {
        var _fields = _lines[_i].trim().split(",");
        if (_i === 0) {
            for (var _f = 0; _f < _fields.length; _f++) {
                _keys.push(_fields[_f].trim());
            }
        }
        else {
            // 整理成一筆資料
            var _row = [];
            for (var _f = 0; _f < _fields.length; _f++) {
                var _key = _keys[_f];
                var _value = _fields[_f];
                if (isNaN(_value) === false) {
                    _value = eval(_value);
                }
                _row.push({
                    key: _key,
                    value: _value
                });
            }
            _process(_row);
        }
    }
};

// ----------------------
var _build_lag_data = function (_profile, _sequence, _lag_config) {
    var _data = [];
    var _class_data = [];
    for (var _user in _sequence) {
        if (typeof(_profile[_user]) === "undefined") {
            continue;
        }
        var _user_profile = _profile[_user];
        var _user_seq = _sequence[_user];
        
        for (var _i = 0; _i < _user_seq.length - _lag_config; _i++) {
            var _d = {};
            
            // 加入lag的資料
            for (var _j = 0; _j < _lag_config; _j++) {
                var _seq = _user_seq[_i+_j];
                for (var _s in _seq) {
                    if (_s !== "time") {
                        _d["lag"+_j+"_" + _s] = _seq[_s];
                    }
                }
            }
            
            // 加入profile的資料
            for (var _p in _user_profile) {
                if (_p !== "class") {
                    _d[_p] = _user_profile[_p];
                }
                else {
                    var _class = [_user_profile[_p]];
                    // 計算他離結尾還有多少距離
                    var _end_steps = _user_seq.length - _lag_config - _i;
                    _class = _class * (1/_end_steps);
                    _class_data.push([_class]);
                }
            }
            
            _data.push(_d);
        }
    }
    
    return {
        "lag_data": _data,
        "class_data": _class_data
    };
};

// ----------------------
var _parse_event_dict = function (_sequence) {
    var _dict = [];
    for (var _user in _sequence) {
        var _user_seq = _sequence[_user];
        for (var _u = 0; _u < _user_seq.length; _u++) {
            var _seq = _user_seq[_u];
            
            for (var _v in _seq) {
                if (isNaN(_seq[_v])) {
                    // 如果是類別變數
                    var _value = _seq[_v];
                    _value = _v + "_" + _value;
                    if ($.inArray(_value, _dict) === -1) {
                        _dict.push(_value);
                    }
                }
            }
        }
    }
    
    _dict.sort();
    
    return _dict;
};

var _build_lag_dict = function (_lag_data) {
    var _dict = [];
    for (var _i = 0; _i < _lag_data.length; _i++) {
        var _seq = _lag_data[_i];
            
        for (var _v in _seq) {
            var _value = _v;
            if (isNaN(_seq[_v])) {
                // 如果是類別變數
                var _value = _seq[_v];
                _value = _v + "_" + _value;
            }
            if ($.inArray(_value, _dict) === -1) {
                _dict.push(_value);
            }
        }   
    }
    
    _dict.sort();
    
    return _dict;
};

var _reverse_dict = function (_cat_dict) {
    var _rdict = {};
    
    for (var _i = 0; _i < _cat_dict.length; _i++) {
        _rdict[_cat_dict[_i]] = _i;
    }
    _rdict["_length"] = _cat_dict.length;
    return _rdict;
};

var _create_cat_feature = function (_cat_json, _cat_rdict) {
    var _array = [];
    for (var _i = 0; _i < _cat_rdict["_length"]; _i++) {
        _array.push(0);
    }
    
    for (var _cat in _cat_json) {
        var _value = _cat_json[_cat];
        var _key = _cat;
        if (isNaN(_value)) {
            _key = _cat + "_" + _value;
        }
        
        if (typeof(_cat_rdict[_key]) !== "undefined") {
            var _i = _cat_rdict[_key];
            if (isNaN(_value)) {
                _array[_i] = 1;
            }
            else {
                _array[_i] = _value;
            }
        }
    }
    
    return _array;
};

// ----------------------
var _parse_start_points = function (_sequence) {
    var _points = [];
    for (var _user in _sequence) {
        var _user_seq = _sequence[_user];
        var _event = _user_seq[0];
        var _p = {};
        for (var _e in _event) {
            if (_e !== "time") {
                //console.log(_e);
                _p[_e] = _event[_e];
            }
        }
        _p = JSON.stringify(_p);
        if ($.inArray(_p, _points) === -1) {
            //console.log(_p);
            _points.push(_p);
        }
    }
    return _points;
};

var _parse_end_points = function (_sequence) {
    var _points = [];
    for (var _user in _sequence) {
        var _user_seq = _sequence[_user];
        var _event = _user_seq[(_user_seq.length-1)];
        var _p = {};
        for (var _e in _event) {
            if (_e !== "time") {
                _p[_e] = _event[_e];
            }
        }
        _p = JSON.stringify(_p);
        if ($.inArray(_p, _points) === -1) {
            _points.push(_p);
        }
    }
    return _points;
};

var _parse_next_points = function (_sequence) {
    var _points = {};
    for (var _user in _sequence) {
        var _user_seq = _sequence[_user];
        var _before_point = undefined;
        //console.log(_user_seq);
        for (var _i = 0; _i < _user_seq.length; _i++) {
            var _p = {};
            var _event = _user_seq[_i];
            for (var _e in _event) {
                if (_e !== "time") {
                    _p[_e] = _event[_e];
                }
            }
            var _current_point = JSON.stringify(_p);
            if (_before_point === undefined) {
                _before_point = _current_point;
            }
            else {
                if (_before_point !== _current_point) {
                    if (typeof(_points[_before_point]) === "undefined") {
                        _points[_before_point] = [];
                    }
                    if ($.inArray(_current_point, _points[_before_point]) === -1) {
                        _points[_before_point].push(_current_point);
                    }
                    _before_point = _current_point;
                }
            }
        }
    }
    return _points;
};


// ----------------------
var _build_mlp_model = function (_x, _y) {
    var mlp = new ml.MLP({
        'input' : _x,
        'label' : _y,
        'n_ins' : _x[0].length,
        'n_outs' : _y[0].length,
        'hidden_layer_sizes' : [_x[0].length-1]
    });

    mlp.set('log level',1); // 0 : nothing, 1 : info, 2 : warning.

    mlp.train({
        'lr' : 0.6,
        'epochs' : 50
    });
    
    return mlp;
};

var _build_random_model = function (_x, _y) {
    return {predict: function () {
        return Math.random();
    }};
};



// ---------------------
var _start_generative_path = function (_start_points, _end_points, _next_points, _lag_config, _cat_rdict, _model) {
    var _path = [];
    var _lag_data = [];
    
    var _max_length = 500;
    
    // --------------------------
    // 隨機從_start_points中取出一個
    //console.log(_start_points);
    var _start_point = _array_pick_random_one(_start_points);
    //console.log(["開始", _start_point]);
    _lag_data.push(_start_point);
    _path.push(_start_point);
    
    var _before_point = _start_point;
    while (true) {
        var _next_list = JSON.parse(JSON.stringify(_next_points[_before_point]));
        //console.log(_next_list);
        
        var _pick = function () {
            var _result = _array_pick_random_one_remove(_next_list);
            var _next_point = _result.rand;
            _next_list = _result.array;
            return _next_point;
        };
        var _next_point = _pick();
        //console.log(["開始", _next_point]);
        while ($.inArray(_next_point, _lag_data) > -1 && _next_list.length > 0) {
            _next_point = _pick();
            //console.log(["重複了，挑下一個", _next_point]);
        }
        
        //console.log(_next_point);
        if (_lag_data.length < _lag_config-1) {
            _lag_data.push(_next_point);
            _path.push(_next_point);
        }
        else {
            var _y1 = _predict_y(_lag_data, _next_point, _model, _cat_rdict);
            //console.log(["先走這個", _y1, _next_point]);
            while (_next_list.length > 0) {
                var _next_point2 = _pick();
                var _y2 = _predict_y(_lag_data, _next_point2, _model, _cat_rdict);
                //console.log(["挑一個試試看", _y2, _next_point2]);
                
                if (_y2 > _y1) {
                    //console.log(["更新", _y2, _next_point2]);
                    _next_point = _next_point2;
                    _y1 = _y2;
                }
                else {
                    break;
                }
            }
            //console.log([_y1, _next_point]);
            _path.push(_next_point);
            _lag_data.slice(0,1);
            _lag_data.push(_next_point);
            _before_point = _next_point;
        }
        
        if (_path.length > _max_length) {
            console.log("失敗了，沒有走到終點");
            break;
        }
        
        if ($.inArray(_next_point, _end_points) > -1) {
            console.log(["成功走到終點", _path.length, _path]);
            break;
        }
    }
    
    return _path;
};

var _array_pick_random_one = function (_array) {
    return _array[Math.floor(Math.random() * _array.length)];
};

var _array_pick_random_one_remove = function (_array) {
    var _i = Math.floor(Math.random() * _array.length);
    var _rand = _array[_i];
    _array.splice(_i, 1);
    return {
        rand: _rand,
        array: _array
    };
};

var _array_clone = function (_array) {
    return JSON.parse(JSON.stringify(_array));
};

var _predict_y = function (_lag_data, _next_point, _model, _cat_rdict) {
    var _lag_data1 = _array_clone(_lag_data);
    _lag_data1.push(_next_point);
    //console.log(_lag_data);

    // 把它轉換成能預測的資料
    var _x_json = {};
    for (var _l = 0; _l < _lag_data1.length; _l++) {

        var _json = JSON.parse(_lag_data1[_l]);
        for (var _key in _json) {
            _x_json["lag" + _l + "_" + _key] = _json[_key];
        }
    }
    var _x = _create_cat_feature(_x_json, _cat_rdict);
    //console.log(_x);
    var _y = _model.predict([_x]);
    while (typeof(_y) === "object") {
        _y = _y[0];
    }
    
    return _y;
};

// ---------------------

var _loading_enable = function (_callback) {
    $("#preloader").show().fadeIn(_callback);
};

var _loading_disable = function () {
    $("#preloader").fadeOut().hide();
};

// ---------------------

var arrayMin = function (arr) {
  return arr.reduce(function (p, v) {
    return ( p < v ? p : v );
  });
};

var arrayMax = function (arr) {
  return arr.reduce(function (p, v) {
    return ( p > v ? p : v );
  });
};

var _float_to_fixed = function(_float, _fixed) {
	var _place = 1;
	for (var _i = 0; _i < _fixed; _i++) {
		_place = _place * 10;
	}
	return Math.round(_float * _place) / _place;
};

var _stat_avg = function(_ary) {
	var sum = _ary.reduce(function(a, b) { return a + b; });
	var avg = sum / _ary.length;
	return avg;
};

var _stat_stddev = function (_ary) {
   var i,j,total = 0, mean = 0, diffSqredArr = [];
   for(i=0;i<_ary.length;i+=1){
       total+=_ary[i];
   }
   mean = total/_ary.length;
   for(j=0;j<_ary.length;j+=1){
       diffSqredArr.push(Math.pow((_ary[j]-mean),2));
   }
   return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl){
            return firstEl + nextEl;
          })/_ary.length));
};

// -------------------------------------

var _change_to_fixed = function () {
	var _to_fixed = $("#decimal_places").val();
	_to_fixed = parseInt(_to_fixed, 10);
	
	var _tds = $(".stat-result td[data-ori-value]");
	for (var _i = 0; _i < _tds.length; _i++) {
		var _td = _tds.eq(_i);
		var _value = _td.data("ori-value");
		_value = parseFloat(_value, 10);
		_value = _float_to_fixed(_value, _to_fixed);
		_td.text(_value);
	}
};

// -------------------------------------

var _output_filename_surffix="-result";
//var _output_filename_test_surffix="_test_set";
var _output_filename_ext=".csv";
var _output_filename_prefix="csv_result-";


// -------------------------------------

var _file_temp;

var _load_file = function(evt) {
    //console.log(1);
    if(!window.FileReader) return; // Browser is not compatible

    var _panel = $(".file-process-framework");
    
    _panel.find(".loading").removeClass("hide");

    var reader = new FileReader();
    var _result;

    var _original_file_name = evt.target.files[0].name;
    //var _pos = _original_file_name.lastIndexOf(".");
    //var _pos = _original_file_name.length;
    var _pos = _original_file_name.indexOf(".");
    //var _file_name = _original_file_name.substr(0, _pos)
    //    + _output_filename_surffix
    //    //+ _original_file_name.substring(_pos, _original_file_name.length);
    var _file_name = _output_filename_prefix + _original_file_name.substr(0, _pos);
    _file_name = _file_name + _output_filename_ext;
    
    _panel.find(".filename").val(_file_name);
    
    reader.onload = function(evt) {
        if(evt.target.readyState !== 2) return;
        if(evt.target.error) {
            alert('Error while reading file');
            return;
        }

        //filecontent = evt.target.result;

        //document.forms['myform'].elements['text'].value = evt.target.result;
        _result =  evt.target.result;
        _file_temp = _result;
        _start_process_file();
    };
    
    
    var _start_process_file = function () {
        _process_file(_result, undefined, function (_result) {
            _panel.find(".preview").val(_result);
                        
            $(".file-process-framework .myfile").val("");
            $(".file-process-framework .loading").addClass("hide");
            _panel.find(".display-result").show();
            _panel.find(".display-result .encoding").show();

            var _auto_download = (_panel.find('[name="autodownload"]:checked').length === 1);
            if (_auto_download === true) {
                _panel.find(".download-file").click();
            }
            
            //_download_file(_result, _file_name, "txt");
        });
    };

    //console.log(_file_name);

    reader.readAsText(evt.target.files[0]);
};

var _load_file_buffer = function(evt) {
    //console.log(1);
    if(!window.FileReader) return; // Browser is not compatible

    var _panel = $(".file-process-framework");
    
    _panel.find(".loading").removeClass("hide");

    var reader = new FileReader();
    var _result_buffer;

    reader.onload = function(evt) {
        if(evt.target.readyState !== 2) return;
        if(evt.target.error) {
            alert('Error while reading file');
            return;
        }

        //filecontent = evt.target.result;

        //document.forms['myform'].elements['text'].value = evt.target.result;
        _result_buffer =  evt.target.result;
        _result =  _file_temp;
        if (_result === undefined) {
            $(".file-process-framework .myfile_buffer").val("");
            alert("Test ARFF is not ready.");
            return;
        }
        _start_process_file();
    };
    
    
    var _start_process_file = function () {
        _process_file(_result, _result_buffer, function (_result) {
            _panel.find(".preview").val(_result);
                        
            $(".file-process-framework .myfile_buffer").val("");
            $(".file-process-framework .loading").addClass("hide");
            _panel.find(".display-result").show();
            _panel.find(".display-result .encoding").show();

            var _auto_download = (_panel.find('[name="autodownload"]:checked').length === 1);
            if (_auto_download === true) {
                _panel.find(".download-file").click();
            }
            
            //_download_file(_result, _file_name, "txt");
        });
    };

    //console.log(_file_name);

    reader.readAsText(evt.target.files[0]);
};


var _load_textarea = function(evt) {
    var _panel = $(".file-process-framework");
    
    // --------------------------

    var _result = _panel.find(".input-mode#input_mode_textarea").val();
    var _buffer = _panel.find(".input-mode#input_mode_textarea_buffer").val();
    if (_result.trim() === "") {
        return;
    }

    // ---------------------------
    
    _panel.find(".loading").removeClass("hide");

    // ---------------------------
    var d = new Date();
    var utc = d.getTime() - (d.getTimezoneOffset() * 60000);
  
    var local = new Date(utc);
    //var _file_date = local.toJSON().slice(0,19).replace(/:/g, "-");
    var time = new Date();
    var _file_date = ("0" + time.getHours()).slice(-2)
            + ("0" + time.getMinutes()).slice(-2);
    var _file_name = "csv_result-" + _file_date + _output_filename_ext;
    var _test_file_name = "test_document_" + _file_date + _output_filename_ext;

    _panel.find(".filename").val(_file_name);
    _panel.find(".test_filename").val(_test_file_name);
    
    // ---------------------------

    _process_file(_result, _buffer, function (_result) {
        _panel.find(".preview").val(_result);

        _panel.find(".loading").addClass("hide");
        _panel.find(".display-result").show();
        _panel.find(".display-result .encoding").hide();

        var _auto_download = (_panel.find('[name="autodownload"]:checked').length === 1);
        if (_auto_download === true) {
            _panel.find(".download-file").click();
        }
    });
};

var _download_file_button = function () {
    var _panel = $(".file-process-framework");
    
    var _file_name = _panel.find(".filename").val();
    var _data = _panel.find(".preview").val();
    
    _download_file(_data, _file_name, "arff");
};

var _download_test_file_button = function () {
    var _panel = $(".file-process-framework");
    
    var _file_name = _panel.find(".test_filename").val();
    var _data = _panel.find(".test_preview").val();
    
    _download_file(_data, _file_name, "arff");
};


var _download_file = function (data, filename, type) {
    var a = document.createElement("a"),
        file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }

};

// ----------------------------

var _copy_table = function () {
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
	
	_copy_to_clipboard(_text);
};

var _copy_csv_table = function () {
	var _button = $(this);
	
	var _text = $("#preview").val().replace(/,/g , "\t");
	
	_copy_to_clipboard(_text);
};

var _copy_to_clipboard = function(_content) {
	//console.log(_content);
	var _button = $('<button type="button" id="clipboard_button"></button>')
		.attr("data-clipboard-text", _content)
		.hide()
		.appendTo("body");
		
	var clipboard = new Clipboard('#clipboard_button');
	
	_button.click();
	_button.remove();
};

// -----------------------

var _change_show_fulldata = function () {
	
	var _show = ($("#show_fulldata:checked").length === 1);
	//console.log([$("#show_fulldata").attr("checked"), _show]);

	var _cells = $(".stat-result .fulldata");
	if (_show) {
		_cells.show();
	}
	else {
		_cells.hide();
	}
};

var _change_show_std = function () {
	var _show = ($("#show_std:checked").length === 1);

	var _cells = $(".stat-result tr.std-tr");
	if (_show) {
            _cells.show();
	}
	else {
            _cells.hide();
	}
};

// -----------------------

$(function () {
  var _panel = $(".file-process-framework");
  _panel.find(".input-mode.textarea").change(_load_textarea);
  _panel.find(".myfile").change(_load_file);
  _panel.find(".myfile_buffer").change(_load_file_buffer);
  //_panel.find("#input_file_submit").click(_load_file);
  _panel.find(".download-file").click(_download_file_button);
  _panel.find(".download-test-file").click(_download_test_file_button);
  
  $('.menu .item').tab();
  $("button.copy-table").click(_copy_table);
  $("button.copy-csv").click(_copy_csv_table);
  $("#decimal_places").change(_change_to_fixed);
  
  $("#show_fulldata").change(_change_show_fulldata);
  $("#show_std").change(_change_show_std);
  
  // 20170108 測試用
  //_load_textarea();
  $.get("profile.csv", function (_csv) {
    $("#input_mode_textarea").val(_csv);  
    $.get("sequence.csv", function (_csv) {
        $("#input_mode_textarea_buffer").val(_csv);
        _load_textarea();
    });  
  });
    
});