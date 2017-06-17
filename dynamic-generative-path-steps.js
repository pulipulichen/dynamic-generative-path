
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
    var _enable_same_next = false;
    
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
                if (_enable_same_next || _before_point !== _current_point) {
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
    
    _points["null"] = DGP.start_steps;
    
    return _points;
};
