// dynamic-generative-path object
DGP = {};

DGP.main = function () {
    var _result = "";
    // 
// ---------------------------------------
    // 將CSV轉換成JSON
    var _profile = DGP.parse_profile($("#input_mode_textarea_profile").val());
    //console.log(_profile);
    var _sequence = DGP.parse_sequence($("#input_mode_textarea_sequence").val());
    //console.log(_sequence);
    var _target = DGP.parse_profile($("#input_mode_textarea_target").val());
    //console.log(_profile);
    
    // -----------------------------------
    // 準備模型所需的資料
    var _lag_config = parseInt($("#lag_config").val(), 10);
    //console.log(_lag_config);
    
    // 建立lag資料
    var _lag_data_json = DGP.build_lag_data(_target, _sequence, _lag_config);
    var _lag_data = _lag_data_json.lag_data;
    var _class_data = _lag_data_json.class_data;
    //console.log(_lag_data);
    //console.log(_class_data);
    
    
    var _cat_dict = DGP.build_lag_dict(_lag_data);
    //console.log(_cat_dict);
    var _cat_rdict = DGP.reverse_dict(_cat_dict);
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
    
    var _numeric_lag_data = DGP.convert_cat_to_numeric(_lag_data, _cat_rdict);
    //console.log(_numeric_lag_data);
    
    // ------------------------------------
    var _model;
    if (false) {
        // 建立類神經網路
        _model = MODELS.build_mlp_model(_numeric_lag_data, _class_data);
    }
    else {
        // 建立隨機模型
        _model = MODELS.build_random_model(_numeric_lag_data, _class_data);
    }
    
    // -----------------------------------
    // 準備生成路徑所需的資料
    var _start_points = DGP.parse_start_points(_sequence);
    //console.log(_start_points);
    var _end_points = DGP.parse_end_points(_sequence);
    //console.log(_end_points);
    
    var _next_points = DGP.parse_next_points(_sequence);
    //console.log(_next_points);
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
    //console.log(["平均完成步數", (_path_sum/100)]);
    
    _result = _path.join("\n");
    _result = "總共" + _path.length + "步\n" + _result;
    
    return _result;
};

// ----------------------------------

/**
 * 把CSV轉換成JSON
 * @param {type} _profile_csv
 * @returns {unresolved}
 */
DGP.parse_profile = function (_profile_csv) {
    var _profile = {};
    FPF_CSV.csv_each(_profile_csv, function (_row) {
        var _user = _row[0].value;
        _profile[_user] = {};
        for (var _r = 1; _r < _row.length; _r++) {
            _profile[_user][_row[_r].key] = _row[_r].value;
        }
    });
    return _profile;
};

/**
 * 把CSV轉換成JSON
 * @param {String} _sequence_csv
 * @returns {JSON}
 */
DGP.parse_sequence = function (_sequence_csv) {
    var _sequence = {};
    FPF_CSV.csv_each(_sequence_csv, function (_row) {
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


// ----------------------

DGP.build_lag_data = function (_profile, _sequence, _lag_config) {
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

// --------------------------------------

/**
 * 整理成類別資料
 * @deprecated 20170616
 * @param {JSON} _sequence
 * @returns {Array}
 */
DGP.parse_event_dict = function (_sequence) {
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

DGP.build_lag_dict = function (_lag_data) {
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

DGP.reverse_dict = function (_cat_dict) {
    var _rdict = {};
    
    for (var _i = 0; _i < _cat_dict.length; _i++) {
        _rdict[_cat_dict[_i]] = _i;
    }
    _rdict["_length"] = _cat_dict.length;
    return _rdict;
};

DGP.create_cat_feature = function (_cat_json, _cat_rdict) {
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

DGP.convert_cat_to_numeric = function (_lag_data, _cat_rdict) {
    var _numeric_lag_data = [];
    for (var _i = 0; _i < _lag_data.length; _i++) {
        var _d = _create_cat_feature(_lag_data[_i], _cat_rdict);
        _numeric_lag_data.push(_d);
    }
    return _numeric_lag_data;
};

// ---------------------------------

DGP.parse_start_points = function (_sequence) {
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

DGP.parse_end_points = function (_sequence) {
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

DGP.parse_next_points = function (_sequence) {
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

// -----------------------

DGP.start_generative_path = function (_start_points, _end_points, _next_points, _lag_config, _cat_rdict, _model) {
    var _path = [];
    var _lag_data = [];
    
    var _max_length = 500;
    
    // --------------------------
    // 隨機從_start_points中取出一個
    //console.log(_start_points);
    var _start_point = DGP_ARRAY.array_pick_random_one_remove(_start_points);
    //console.log(["開始", _start_point]);
    _lag_data.push(_start_point);
    _path.push(_start_point);
    
    var _before_point = _start_point;
    while (true) {
        var _next_list = DGP_ARRAY.array_clone(_next_points[_before_point]);
        //console.log(_next_list);
        
        var _next_point = DGP_ARRAY.array_pick_random_one_remove(_next_list);
        
        // 關閉已知陣列的檢查，這個雖然可以幫助快點走到終點，但不一定好
        //while (_next_list.length > 0 && $.inArray(_next_point, _lag_data) > -1) {
        //    _next_point = DGP_ARRAY.array_pick_random_one_remove(_next_list);
        //    //console.log(["重複了，挑下一個", _next_point]);
        //}
        
        //console.log(_next_point);
        if (_lag_data.length < _lag_config-1) {
            _lag_data.push(_next_point);
            _path.push(_next_point);
        }
        else {
            var _y1 = DGP.predict_y(_lag_data, _next_point, _model, _cat_rdict);
            //console.log(["先走這個", _y1, _next_point]);
            while (_next_list.length > 0) {
                var _next_point2 = _pick();
                var _y2 = DGP.predict_y(_lag_data, _next_point2, _model, _cat_rdict);
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

// ---------------------------------------------

DGP.convert_lag_data_to_x = function (_lag_data, _next_point, _cat_rdict) {
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
    var _x = DGP.create_cat_feature(_x_json, _cat_rdict);
    return _x;
};

DGP.predict_y = function (_lag_data, _next_point, _model, _cat_rdict) {
    var _x = DGP.convert_lag_data_to_x(_lag_data, _next_point, _cat_rdict);
    //console.log(_x);
    var _y = _model.predict([_x]);
    
    // 直接取得一個數值
    while (typeof(_y) === "object") {
        _y = _y[0];
    }
    
    return _y;
};