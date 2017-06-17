// dynamic-generative-path object
DGP = {};

DGP.profile = {};
DGP.sequence = {};
DGP.target = {};
DGP.config = {};
DGP.predict_function = null;
DGP.start_steps = [];
DGP.end_steps = [];
DGP.next_steps_dict = [];
DGP.target_only_end_distance = true;

DGP.main = function () {
    var _result = [];
    // 
    // ------------ ---------------------------
    // 將CSV轉換成JSON
    var _profile = DGP.parse_profile($("#input_mode_textarea_profile").val());
    _profile = DGP.feature_normalize(_profile);
    DGP.profile = _profile;
    //DGP.console_log("profile", _profile);
    
    var _sequence = DGP.parse_sequence($("#input_mode_textarea_sequence").val());
    _sequence = DGP.feature_normalize(_sequence);
    DGP.sequence = _sequence;
    DGP.console_log("sequence", _sequence);
    
    var _target = DGP.parse_profile($("#input_mode_textarea_target").val());
    //_target = DGP.feature_normalize(_target);
    DGP.target = _target;
    //DGP.console_log("_target", _target);
    
    // -------------------------------------
    // 計算每人平均步數
    var _user_path_count = [];
    for (var _user in _sequence) {
        _user_path_count.push(_sequence[_user].length);
    }
    _result.push("每人步數平均數:" + FPF_STATISTICS.stat_avg(_user_path_count));
    _result.push("每人步數標準差:" + FPF_STATISTICS.stat_stddev(_user_path_count));
    _result.push("\n");
    
    // -----------------------------------
    // 準備生成路徑所需的資料
    DGP.start_steps = DGP.parse_start_steps();
    //DGP.console_log("start_steps", DGP.start_steps);
    DGP.end_steps = DGP.parse_end_steps();
    //DGP.console_log("end_steps", DGP.end_steps);
    DGP.next_steps_dict = DGP.parse_next_steps_dict();
    DGP.console_log("next_steps_dict", DGP.next_steps_dict);
    
    // -----------------------------------
    // 準備模型所需的資料
    DGP.config.lag_length = parseInt($("#lag_config").val(), 10);
    var _config_batch_size = parseInt($("#config_batch_size").val(), 10);
    //console.log(DGP.config.lag_length);
    
    // 建立lag資料
    var _model_data = DGP.build_model_data();
    DGP.console_log("train_data[0]", [_model_data.train[0], _model_data.target[0]]);
    DGP.console_log("train_data[1]", [_model_data.train[1], _model_data.target[1]]);
    DGP.console_log("train_data last", [FPF_ARRAY.get_last(_model_data.train),  FPF_ARRAY.get_last(_model_data.target)]);
    //return;
    
    // --------------------------------------------
    
    var _model_type = $('input[name="model"]:checked').val();
    var _config_end_distance_weight = FPF_FORM.get_value_float("#config_end_distance_weight");
    
    DGP.predict_function = DGP.build_predict_function(_model_type
        , _model_data.train
        , _model_data.target
        , _config_end_distance_weight);
    
    // ------------------------------------
    // 開始進行生成
    
    var _mock_profile = DGP.generate_mock_profile(_profile);
    _result.push("產生mock profile");
    _result.push(JSON.stringify(_mock_profile));
    _result.push("\n");
    //DGP.console_log("mock", _mock_profile);
    
    // -----------------------------
    
    var _goal_array = [];
    var _path_result_array = [];
    for (var _i = 0; _i < _config_batch_size; _i++) {
        var _path_result = DGP.build_generative_path(_mock_profile);
        var _path = _path_result.path;
        _path_result_array.push(_path.length);
        
        if (_path_result.goal === true) {
            _goal_array.push(1);
        }
        else {
            _goal_array.push(0);
        }
        
        _result.push([_path_result.goal, _path.length].join(","));
    }
    
    // ------------------------
    
    var _avg = FPF_STATISTICS.stat_avg(_path_result_array);
    _avg = FPF_STATISTICS.float_to_fixed(_avg, 3);
    _result.push(["生成步數平均數", _avg].join(","));
    
    var _std = FPF_STATISTICS.stat_stddev(_path_result_array);
    _std = FPF_STATISTICS.float_to_fixed(_std, 3);
    _result.push(["生成步數標準差", _std].join(","));
    
    var _avg = FPF_STATISTICS.stat_avg(_goal_array);
    _avg = FPF_STATISTICS.float_to_fixed(_avg, 3);
    _result.push(["生成路徑成功率", _avg].join(","));
    
    _result.push("\n最後一個生成路徑:");
    _result.push(_path.join("\n"));
    
    // ---------------------
    
    //_result = _path.join("\n");
    //_result = "總共" + _path.length + "步\n" + _result;
    _result = _result.join("\n");
    
    return _result;
};

// ----------------------------------

DGP.generate_mock_profile = function (_profile) {
    
    // ----------------------
    // 建立起feature資料庫
    var _features_array = {};
    for (var _user in _profile) {
        for (var _key in _profile[_user]) {
            var _value = _profile[_user][_key];
            if (typeof(_features_array[_key]) === "undefined") {
                _features_array[_key] = [];
            }
            
            if ($.inArray(_value, _features_array[_key]) === -1) {
                _features_array[_key].push(_value);
            }
        }
    }
    
    // --------------------
    // 挑選隨機特徵
    var _feature = {};
    for (var _key in _features_array) {
        _feature[_key] = FPF_ARRAY.array_pick_random_one(_features_array[_key]);
    }
    
    return _feature;
};

// ----------------------------------

// ----------------------

DGP.console_log = function (_title, _message) {
    if (typeof(_message) === "undefined") {
        _message = _title;
        _title = undefined;
    }
    
    if (_title !== undefined) {
        console.log("[" + _title + "]");
    }
    
    console.log(_message);
    
    return this;
};

// ----------------------

/**
 * @deprecated 20170617 Pulipuli Chen
 * @param {type} _end_steps
 * @param {type} _user_target
 * @returns {unresolved}
 */
DGP.build_target_data = function (_end_steps, _user_target) {
    var _target_data = {};
    //if (_end_steps === 0) {
    //    _end_steps = 0.5;
    //}
    //_end_steps = Math.sqrt(_end_steps);
    //_end_steps = 1 /_end_steps;
    //console.log(["end_steps", _end_steps]);
    //_end_steps =  Math.log(_end_steps);
    
    
    return _target_data;
};

DGP.build_model_data = function () {
    var _data = [];
    var _class_data = [];
    
    var _profile = DGP.profile;
    var _sequence = DGP.sequence;
    var _target = DGP.target;
    var _lag_config = DGP.config.lag_length;
    
    var _max_end_distance = 0;
        
    // ------------------------------
    
    //console.log(_sequence);
    //console.log(_target);
    for (var _user in _sequence) {
        var _user_seq = _sequence[_user];
        
        //console.log([_user, _user_seq.length, typeof(_target[_user])]);
        if (typeof(_target[_user]) === "undefined") {
            continue;
        }
        var _user_profile = _profile[_user];
        var _user_target = _target[_user];
        
        if (_max_end_distance < _user_seq.length) {
            _max_end_distance = _user_seq.length;
        }
        
        //console.log([_user, _user_seq.length, _lag_config]);
        var _start_i = 0;
        for (var _i = _start_i; _i < _user_seq.length; _i++) {
            // 取得目前的seq
            var _lag_seq = [];
            
            for (var _j = _lag_config; _j >= 0; _j--) {
                var _current_index = _i - _j;
                var _seq = DGP.create_null_seq();
                if (typeof(_user_seq[_current_index]) === "object") {
                    _seq = _user_seq[_current_index];
                }
                _lag_seq.push(_seq);
            }
            
            // --------------------
            var _d = {};
            for (var _j = 0; _j < _lag_seq.length; _j++) {
                for (var _s in _lag_seq[_j]) {
                    if (_s === "time") {
                        continue;
                    }
                    
                    var _key = DGP.build_lag_key(_j, _s);
                    var _value = _lag_seq[_j][_s];
                    _d[_key] = _value;
                }
            }
            
            // 加入profile的資料
            for (var _p in _user_profile) {
                _d[_p] = _user_profile[_p];
            }
            
            //console.log(_d);
            _data.push(_d);
            
            // -----------------------------------------
            
            // 加入target的資料
            //var _end_steps = _user_seq.length - _i - 1;
            // 0
            // 5
            // 0 1 2 3 4
            var _end_steps = (_i - _start_i) / (_user_seq.length - 1 - _start_i);
            //console.log(_end_steps);
            
            var _target_data = {};         
            _target_data["end_distance"] = _end_steps;
            if (DGP.target_only_end_distance === false) {
                for (var _p in _user_target) {
                    _target_data[_p] = _user_target[_p];
                }
            }
            //console.log(["target", _user, JSON.stringify(_target_data)]);
            _class_data.push(_target_data);
        }   // for (var _i = 0; _i < (_user_seq.length - _lag_config); _i++) {
    }
    
    _max_end_distance = _max_end_distance + 1;
    
    // 全部減去最大距離
    /*
    var _max = 0;
    var _min = 0;
    for (var _i = 0; _i < _class_data.length; _i++) {
        _class_data[_i]["end_distance"] = _max_end_distance - _class_data[_i]["end_distance"];
        console.log(_class_data[_i]["end_distance"]);
    }
    console.log(["最大距離", _max_end_distance]);
    */
    
    var _result = {
        "train": _data,
        "target": _class_data
    };
   
    return _result;
};

/**
 * 建立一組空的seq
 * @param {type} _seq
 * @returns {String}
 */
DGP.create_null_seq = function () {
    var _seq = DGP.get_first_seq();
    var _result = {};
    for (var _key in _seq) {
        if (_key === "time") {
            continue;
        }
        
        _result[_key] = "null";
    }
    return _result;
};

DGP.get_first_seq = function () {
    for (var _user in DGP.sequence) {
        return DGP.sequence[_user][0];
    }
};

// -----------------------

DGP.build_generative_path = function (_user_profile) {
    var _lag_config = DGP.config.lag_length;
    
    var _path = [];
    var _lag_data = [];
    
    var _max_length = FPF_FORM.get_value_float("#config_path_max_length");
    var _goal = false;
    
//    var _push_next_point = function (_next_point) {
//        _lag_data = _lag_data.slice(0,1);
//        _lag_data.push(_next_point);
//        //DGP.console_log("_push_next_point", _lag_data.length);
//    };
    
    var _before_point = "null";
    var _last_y = 0;
    while (true) {
        var _next_list = FPF_ARRAY.array_clone(DGP.next_steps_dict[_before_point]);
        if (_next_list.length === 0) {
            console.log(["無路可走", _path.length, _path]);
            break;
        }
        //console.log(["before", _before_point, _next_list]);
        
        //console.log(_next_list);
        
        // 關閉已知陣列的檢查，這個雖然可以幫助快點走到終點，但不一定好
        //while (_next_list.length > 0 && $.inArray(_next_point, _lag_data) > -1) {
        //    _next_point = FPF_ARRAY.array_pick_random_one_remove(_next_list);
            //console.log(["重複了，挑下一個", _next_point]);
        //}
        
        //console.log(_next_point);
        var _choose_result = DGP.choose_best_next_point(_user_profile, _lag_data, _next_list, _last_y);
        var _step = _choose_result.step;
        _last_y = _choose_result.y;
        console.log([_last_y, _step]);

        //console.log([_y1, _next_point]);
        _path.push(_step);
        
        _lag_data.push(_step);
        if (_lag_data.length > _lag_config) {
            _lag_data = _lag_data.slice(0,1);
        }
            
        _before_point = _step;
        
        // -------------
        
        if (_path.length > _max_length) {
            console.log(["失敗了，沒有走到終點", _path[0], _path[1], _path]);
            break;
        }
        
        if ($.inArray(_step, DGP.end_steps) > -1) {
            console.log(["成功走到終點", _path[0], _path[1], _path.length, _path]);
            _goal = true;
            break;
        }
    }
    
    
    
    return {
        path: _path,
        goal: _goal
    };
};

DGP.has_next_step = function (_step) {
    if (DGP.is_end_step(_step) === true) {
        return true;
    }
    return (typeof(DGP.next_steps_dict[_step]) !== "undefined");
};

DGP.is_end_step = function (_step) {
    return ($.inArray(_step, DGP.end_steps) > -1);
};

DGP.choose_best_next_point = function (_profile, _lag_data, _next_list, _last_y) {
    /**
     * 是否不重複lag_data中走過的路？
     * @type Boolean
     */
    var _enable_same_next = true;
    
    /**
     * 允許最多預測的數量
     * @type Number
     */
    var _predict_result_limit = 100;
    
//    if (_next_list.length === 1) {
//        console.log(["只有一條路選擇", _next_list[0]])
//        return _next_list[0];
//    }

    var _predict_result = [];
    
    console.log(["可以考慮的步數", JSON.stringify(_next_list)]);
    while (_next_list.length > 0) {
        //var _step = _next_list[_i];
        var _step = FPF_ARRAY.array_pick_random_one_remove(_next_list);
        //console.log(_step);
        if (_enable_same_next === false) {
            //console.log(_step);
            //console.log(_lag_data);
            if ($.inArray(_step, _lag_data) > -1) {
                console.log(["不允許相同的步驟", _lag_data, _step])
                continue;
            }
        }
        
        // 不考慮沒有下一步的步數
        if (DGP.has_next_step(_step) === false) {
            continue;
        }

        var _test_data = DGP.build_test_data(_lag_data, _step, _profile);
        //DGP.console_log("_test_data", _test_data);
        
        var _y = DGP.predict_function(_test_data);
        
        // 結果不可比之前的還差
        //if (_y < _last_y) {
        //    console.log(["不好的結果", _y, _last_y, _step]);
        //    continue;
        //}
        
        _predict_result.push({
            y: _y,
            step: _step
        });

        if (_predict_result.length === _predict_result_limit) {
            break;
        }
    }

    if (_predict_result.length === 0) {
        throw "無路可走";
    }

    // 排序
    _predict_result.sort(function (_a, _b) {
        return (_b.y - _a.y);
    });
    //DGP.console_log("_predict_result", _predict_result);
    
    var _i = 0;
    while (_i < _predict_result.length) {
        if (_predict_result[_i].y !== _last_y) {
            break;
        }
        console.log(["踢掉一樣的路徑", _last_y, _predict_result[_i].step]);
        _i++;
    }
    
    if (typeof(_predict_result[_i]) === "undefined") {
        throw "沒有可以選擇的路徑了";
    }
    
    return _predict_result[_i];
};

// ---------------------------------------------

/**
 * @deprecated 20170616 不使用了
 * @param {type} _lag_data
 * @param {type} _next_point
 * @param {type} _cat_rdict
 * @returns {DGP.create_cat_feature._array|Array}
 */
DGP.convert_lag_data_to_x = function (_lag_data, _next_point, _cat_rdict) {
    var _lag_data1 = FPF_ARRAY.array_clone(_lag_data);
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

DGP.build_test_data = function (_lag_data, _next_point, _profile) {
   
    //var _test_array = FPF_ARRAY.array_clone(_lag_data);
    var _test_array = [];
    for (var _i = 0; _i < DGP.config.lag_length - 1; _i++) {
        var _step;
        if (typeof(_lag_data[_i]) === "string") {
            _step = _lag_data[_i];
        }
        else {
            _step = DGP.create_null_seq();
            _step = JSON.stringify(_step);
        }
        _test_array.push(_step);
    }
    _test_array.push(_next_point);
    
    
    var _result = {};
    //DGP.console_log("lag_data", _test_array);
    for (var _l = 0; _l < _test_array.length; _l++) {
        var _json = JSON.parse(_test_array[_l]);
        for (var _key in _json) {
            _result[DGP.build_lag_key(_l, _key)] = _json[_key];
        }
    }
    
    for (var _key in _profile) {
        _result[_key] = _profile[_key];
    }
    
    return _result;
};

DGP.build_lag_key = function (_lag, _key) {
    return "lag" + _lag + "_" + _key;
};


/**
 * 預測y，但之後不使用
 * @deprecated 20170616
 * @param {type} _lag_data
 * @param {type} _next_point
 * @param {type} _model
 * @param {type} _cat_rdict
 * @returns {@arr;_y|DGP.predict_y._y|Number|DGP.predict_y._config_end_distance_weight}
 */
DGP.predict_y = function (_lag_data, _next_point, _model, _cat_rdict) {
    var _x = DGP.convert_lag_data_to_x(_lag_data, _next_point, _cat_rdict);
    //console.log(_x);
    var _y = _model.predict([_x]);
    
    // 直接取得一個數值
    //while (typeof(_y) === "object") {
    //    _y = _y[0];
    //}
    
    if (typeof(_y) === "object") {
        _y = _y[0];

        var _config_end_distance_weight = FPF_FORM.get_value_float("#config_end_distance_weight");
        // 這時候應該會有兩個值
        var _result = 0;
        for (var _i = 0; _i < _y.length; _i++) {
            if (_i === 0) {
                _result = _result + _y[_i] * _config_end_distance_weight;
            }
            else {
                _result = _result + _y[_i];
            }
        }
    }
    return _result;
};

DGP.defuzzication_target_martix = function (_target_data, _config_end_distance_weight) {
    if (typeof(_target_data) !== "object") {
        return _target_data;
    }
    else {
        _target_data = _target_data[0];

        // 這時候應該會有兩個值
        var _result = 0;
        //DGP.console_log("defuzzication_target_martix", _target_data);
        for (var _i = 0; _i < _target_data.length; _i++) {
            if (_i === 0) {
                _result = _result + _target_data[_i] * _config_end_distance_weight;
            }
            else {
                _result = _result + _target_data[_i];
            }
        }
        return _result;
    }
};

// ------------------------------

/**
 * 產生一個預測模型
 * @param {JSON} _train_data
 * @param {JSON} _target_data
 * @returns {DGP.build_predict_function._predict_function}
 */
DGP.build_predict_function = function (_model_type, _train_data, _target_data, _config_end_distance_weight) {
    var _train_rdict = DGP.build_matrix_dict(_train_data);
    //DGP.console_log("train_rdict", _train_rdict);
    
    var _numeric_train_data = DGP.convert_cat_to_numeric(_train_data, _train_rdict);
    //DGP.console_log("numeric_train_data", _numeric_train_data[0]);
    
    var _target_rdict = DGP.build_matrix_dict(_target_data);
    //DGP.console_log("_target_rdict", _target_rdict);
    
    var _numeric_target_data = DGP.convert_cat_to_numeric(_target_data, _target_rdict);
    //DGP.console_log("numeric_target_data", _numeric_target_data[0]);
    
    // ------------------------------------
    var _model = MODELS.get_model();
    //console.log(["model", _model]);
    if (_model === null) {
        if (_model_type === "radio_model_mlp") {
            // 建立類神經網路
            _model = MODELS.build_mlp_model(_numeric_train_data, _numeric_target_data);
        }
        else if (_model_type === "radio_model_random") {
            // 建立隨機模型
            _model = MODELS.build_random_model(_numeric_train_data, _numeric_target_data);
        }
    }
    
    /**
     * 產生一個預測功能
     * @param {JSON} _test_data
     * @returns {Number}
     */
    var _predict_function = function (_test_data) {
        //DGP.console_log("_predict_function", _train_rdict);
        //DGP.console_log("_test_data", _test_data);
        var _numeric_test_data = DGP.convert_cat_to_numeric(_test_data, _train_rdict);
        //DGP.console_log("_numeric_test_data", _numeric_test_data);
        var _target_data = _model.predict([_numeric_test_data]);
        var _result = DGP.defuzzication_target_martix(_target_data, _config_end_distance_weight);
        return _result;
    };
    
    return _predict_function;
};