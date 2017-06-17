
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
            _seq[_row[_r].key] = [_row[_r].value];
        }
        _sequence[_user].push(_seq);
    });
    
    // 排序
    for (var _user in _sequence) {
        _sequence[_user].sort(function (_a, _b) {
            return (_a.time - _b.time);
        });
    }
    
    // --------------------------
    // 合併一樣時間的事件
    var _time_interval = 1;
    for (var _user in _sequence) {
        var _last_time = null;
        var _seq = [];
        for (var _i = 0; _i < _sequence[_user].length; _i++) {
            var _s = _sequence[_user][_i];
            var _time = _s.time;
            if (_last_time === null || (_time - _last_time) > _time_interval) {
                _seq.push(_s);
            }
            else {
                var _last_seq = FPF_ARRAY.get_last(_seq);
                for (var _key in _last_seq) {
                    if (_key !== "time") {
                        var _value = _s[_key][0];
                        if ($.inArray(_value, _last_seq[_key]) === -1) {
                            _last_seq[_key].push(_value);
                        }
                    }
                }
            }
            
            _last_time = _time;
        }
        _sequence[_user] = _seq;
    }
    
    // ------------------------------
    // 合併每一個事件
    for (var _user in _sequence) {
        for (var _i = 0; _i < _sequence[_user].length; _i++) {
            for (var _key in _sequence[_user][_i]) {
                if (Array.isArray(_sequence[_user][_i][_key])) {
                    _sequence[_user][_i][_key] = _sequence[_user][_i][_key].sort().join(",");
                }
            }
        }
    }
    
    return _sequence;
};

// ---------------------------------

DGP.parse_start_steps = function () {
    var _sequence = DGP.sequence;
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
    console.log(_points);
    return _points;
};

DGP.parse_end_steps = function () {
    var _sequence = DGP.sequence;
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

/**
 * 建立下一步的資料集
 * @param {JSON} _sequence
 * @returns {Array}
 */
DGP.parse_next_steps_dict = function () {
    var _sequence = DGP.sequence;
    
    /**
     * 是否啟用將下一步也一樣的做法納入考量
     * @type Boolean
     */
    var _enable_same_next = true;
    
    var _points = {};
    for (var _user in _sequence) {
        var _user_seq = _sequence[_user];
        var _before_point = null;
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
            if (_before_point === null) {
                _before_point = _current_point;
            }
            else {
                if (_enable_same_next || _before_point !== _current_point) {
                    if (typeof(_points[_before_point]) === "undefined") {
                        _points[_before_point] = [];
                    }
                    if ($.inArray(_current_point, _points[_before_point]) === -1) {
                        _points[_before_point].push(_current_point);
                        //if (_before_point === _current_point) {
                            //console.log([_before_point, _current_point]);
                        //}
                    }
                    _before_point = _current_point;
                }
            }
        }
    }
    
    _points["null"] = DGP.start_steps;
    
    return _points;
};
