DGP.feature_normalize = function (_array) {
    var _feature_max = {};
    var _feature_min = {};
    
    var _each = function (_process) {
        if (Array.isArray(_array) === true) {
            for (var _i = 0; _i < _array.length; _i++) {
                for (var _key in _array[_i]) {
                    var _value = _array[_i][_key];
                    var _result = _process(_key, _value);
                    if (_result !== undefined) {
                        _array[_i][_key] = _result;
                    }
                }
            }
        }
        else {
            for (var _i in _array) {
                for (var _key in _array[_i]) {
                    var _value = _array[_i][_key];
                    var _result = _process(_key, _value);
                    if (_result !== undefined) {
                        _array[_i][_key] = _result;
                    }
                }
            }
        }
    };
    
    // --------------------------
    // 先找最大值與最小值
    _each(function (_key, _value) {
        if (isNaN(_value) === false && _key !== "time") {
            // 表示是數值
            if (typeof(_feature_max[_key]) === "undefined") {
                _feature_max[_key] = _value;
                _feature_min[_key] = _value;
            }
            else {
                if (_value > _feature_max[_key]) {
                    _feature_max[_key] = _value;
                }
                if (_value < _feature_min[_key]) {
                    _feature_min[_key] = _value;
                }
            }
        }
    });
    
    // --------------------------
    // 計算級距
    _feature_interval = {};
    for (var _key in _feature_max) {
        var _max = _feature_max[_key];
        var _min = _feature_min[_key];
        _feature_interval[_key] = _max - _min;
    }
    
    // --------------------------
    // 計算正規化
    _each(function (_key, _value) {
        if (isNaN(_value) === false && _key !== "time") {
            // 表示是數值
            var _min = _feature_min[_key];
            var _interval = _feature_interval[_key];
            if (_interval > 0) {
                _value = (_value - _min) / _interval;
            }
            else {
                _value = 0;
            }
            //console.log(["調整", _value, _min, _interval])
        }
        return _value;
    });
    
    return _array;
};
// ------------------------------------

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

/**
 * 建立類別轉換成數字矩陣的字典檔案
 * @param {JSON} _json
 * @returns {JSON}
 */
DGP.build_matrix_dict = function (_json) {
    //DGP.console_log("build_matrix_dict", _json);
    var _dict = DGP.build_lag_dict(_json);
    //DGP.console_log("build_lag_dict", _dict);
    var _rdict = DGP.reverse_dict(_dict);
    //DGP.console_log("reverse_dict", _rdict);
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
                
                //_array[_i] = 1;
                
                // 拉低位置的權重
                _array[_i] = 1 / DGP.config.max_sequence_length;
            }
            else {
                _array[_i] = _value;
            }
        }
    }
    
    return _array;
};

DGP.convert_cat_to_numeric = function (_lag_data, _cat_rdict) {
    if (Array.isArray(_lag_data) === false) {
        return DGP.create_cat_feature(_lag_data, _cat_rdict);
    }
    else {
        var _numeric_lag_data = [];
        for (var _i = 0; _i < _lag_data.length; _i++) {
            var _d = DGP.create_cat_feature(_lag_data[_i], _cat_rdict);
            _numeric_lag_data.push(_d);
        }
        return _numeric_lag_data;
    }
};

// --------------------------------------

DGP.count_min_seq_length = function () {
    var _min = null;
    for (var _user in DGP.sequence) {
        var _len = DGP.sequence[_user].length;
        if (_min === null) {
            _min = _len;
        }
        else if (_len < _min) {
            _min = _len;
        }
    }
    return _min;
};