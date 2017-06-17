// dynamic-generative-path object
DGP = {};

DGP.profile = {};
DGP.sequence = {};
DGP.target = {};
DGP.config = {
    "auto_lag_length": 4,
    //"profile_weight": 100,
    //"target_weight": 100,
    //"finish_weight": 100,
    "max_sequence_length": 100,
    "min_sequence_length": 10,
    "max_fail_count": 1
};
DGP.predict_function = null;
DGP.start_steps = [];
DGP.end_steps = [];
DGP.next_steps_dict = [];
DGP.target_only_end_distance = false;
DGP.enable_same_next = true;
DGP.model_data = null;

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
    _target = DGP.feature_normalize(_target);
    DGP.target = _target;
    //DGP.console_log("_target", _target);
    
    // -------------------------------------
    // 計算每人平均步數
    var _user_path_count = [];
    for (var _user in _sequence) {
        _user_path_count.push(_sequence[_user].length);
    }
    _result.push("最大步數:" + FPF_STATISTICS.get_max(_user_path_count));
    DGP.config.max_sequence_length = FPF_STATISTICS.get_max(_user_path_count);
    _result.push("最小步數:" + FPF_STATISTICS.get_min(_user_path_count));
    DGP.config.min_sequence_length = FPF_STATISTICS.get_min(_user_path_count);
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
    var _config_lag_length = FPF_FORM.get_checked_value("config_lag_length");
    var _lag_length = FPF_FORM.get_value_float("#config_lag_length_custom_size");
    if (_config_lag_length === "config_lag_length_auto") {
        _lag_length = DGP.count_min_seq_length();
        _lag_length = parseInt(_lag_length / DGP.config.auto_lag_length, 10);    // 最小長度的1/5
        //_lag_length = parseInt(_lag_length - DGP.config.auto_lag_length, 10);    // 最小長度的1/5
        if (_lag_length < 2) {
            _lag_length = 2;
        }
        _result.push("自動決定lag長度：" + _lag_length);
        console.log("自動決定lag長度：" + _lag_length);
    }
    //var _lag_length = FPF_FORM.get_value_int("#config_lag_length_custom_size");
    DGP.config.lag_length = _lag_length;
    
    
    var _config_batch_size = parseInt($("#config_batch_size").val(), 10);
    //console.log(DGP.config.lag_length);
    
    // 建立lag資料
    DGP.model_data = DGP.build_model_data();
    var _model_data = DGP.model_data;
    DGP.console_log("train_data[0]", [_model_data.train[0], _model_data.target[0]]);
    DGP.console_log("train_data[1]", [_model_data.train[1], _model_data.target[1]]);
    DGP.console_log("train_data last", [FPF_ARRAY.get_last(_model_data.train),  FPF_ARRAY.get_last(_model_data.target)]);
    //return;
    
    // --------------------------------------------
    
    var _model_type = $('input[name="model"]:checked').val();
    //DGP.config.end_distance_weight = FPF_FORM.get_value_float("#config_end_distance_weight");
    //DGP.config.config_finish_task_weight = FPF_FORM.get_value_float("#config_finish_task_weight");
    
    DGP.predict_function = DGP.build_predict_function(_model_type);
    
    // ------------------------------------
    // 開始進行生成
    
    //DGP.console_log("mock", _mock_profile);
    
    // -----------------------------
    var _goal_array = [];
    var _path_result_array = [];
    var _fail_count = 0;
    for (var _i = 0; _i < _config_batch_size; _i++) {
        
        var _mock_profile = DGP.generate_mock_profile();
        _result.push("產生mock profile" + JSON.stringify(_mock_profile));
        
        while (true) {
            var _path_result = DGP.build_generative_path(_mock_profile);

            var _path = _path_result.path;
            if (_path_result.goal === true) {
                _path_result_array.push(_path.length);
                _goal_array.push(1);
                console.log("mock profile" + JSON.stringify(_mock_profile));
                console.log(["成功走到終點", _path.length, _path]);
                break;
            }
            else {
                //_goal_array.push(0);
                if (_fail_count > DGP.max_fail_count) {
                    console.log("超過極限");
                    return;
                }
                
                console.log("mock profile" + JSON.stringify(_mock_profile));
                console.log(_fail_count + "失敗了...準備建立壞的例子");
                DGP.add_fail_path_to_model_data(_mock_profile, _path);

                console.log(_fail_count + "重新生成模型");
                MODELS.reset_model();
                DGP.predict_function = DGP.build_predict_function(_model_type);
                _fail_count++;
            }
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
    
    _result.push(["對抗生成模型次數：", _fail_count].join(''));
    
    _result.push("\n最後一個生成路徑:");
    _result.push(_path.join("\n"));
    
    // ---------------------
    
    //_result = _path.join("\n");
    //_result = "總共" + _path.length + "步\n" + _result;
    _result = _result.join("\n");
    
    return _result;
};

// ----------------------------------

DGP.generate_mock_profile = function () {
    var _profile = this.profile;
    
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

DGP.build_model_data = function () {
    var _data = [];
    var _class_data = [];
    
    var _profile = DGP.profile;
    var _sequence = DGP.sequence;
    var _target = DGP.target;
    var _lag_config = DGP.config.lag_length;
    
    var _max_end_distance = 0;
    
    //var _target_weight = DGP.config.max_sequence_length;
    //var _finish_weight = DGP.config.max_sequence_length;
        
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
            var _d = DGP.build_train_data(_lag_seq, _user_profile);
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
            _target_data["_end_distance"] = _end_steps;
            _target_data["_finish"] = 1;
            if (DGP.target_only_end_distance === false) {
                for (var _p in _user_target) {
                    _target_data[_p] = _user_target[_p];
                }
            }
            //console.log(["target", _user, JSON.stringify(_target_data)]);
            _class_data.push(_target_data);
        }   // for (var _i = 0; _i < (_user_seq.length - _lag_config); _i++) {
    }
    
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
    var _loop_detect_lag_data = [];
    
    //var _max_length = FPF_FORM.get_value_float("#config_path_max_length");
    var _max_length = DGP.config.max_sequence_length;
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
        try {
            var _choose_result = DGP.choose_best_next_point(_user_profile, _lag_data, _next_list, _last_y);
        }
        catch (_e) {
            console.log(_e);
            break;
        }
        var _step = _choose_result.step;
        _last_y = _choose_result.y;
        //console.log([_last_y, _step]);

        //console.log([_y1, _next_point]);
        _path.push(_step);
        
        
        // -------------
        
        
        if (_path.length > _max_length) {
            //throw ["失敗了，沒有走到終點", _path[0], _path[1], _path];
            console.log("失敗了，沒有走到終點", _path[0], _path[1], _path);
            //console.log(_lag_data);
            //throw _loop_detect_lag_data;
            break;
        }
        
        // --------------
        
        
        if (_lag_data.length === _lag_config) {
            //_lag_data = _lag_data.slice(0,1);
            //_lag_data.slice(0,1);
            _lag_data.shift();
        }
        
        if (_loop_detect_lag_data.length === ((_lag_config * 2) + 1) ) {
            //_loop_detect_lag_data = _loop_detect_lag_data.slice(0,1);
            //_loop_detect_lag_data.slice(0,1);
            _loop_detect_lag_data.shift();
        }
        
        _lag_data.push(_step);
        _loop_detect_lag_data.push(_step);
        
        // 偵測是否是loop
        if (_path.length > _lag_config * 3) {
            
            var _loop_str = JSON.stringify(_loop_detect_lag_data);
            var _lag_str = JSON.stringify(_lag_data.concat(_lag_data));
            _lag_str = _lag_str.substr(1);
            //console.log(["迴圈嗎？", _loop_str, _lag_str]);
            if (_loop_str.indexOf(_lag_str) > -1) {
                console.log("失敗了，產生迴圈", _loop_detect_lag_data, _path);
                break;
            }
        }
        _before_point = _step;
        
        if ($.inArray(_step, DGP.end_steps) > -1) {
            //console.log(["成功走到終點", _path[0], _path[1], _path.length, _path]);
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
    var _enable_same_next = DGP.enable_same_next;
    
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
    
    //console.log(["可以考慮的步數", JSON.stringify(_next_list)]);
    while (_next_list.length > 0) {
        //var _step = _next_list[_i];
        var _step = FPF_ARRAY.array_pick_random_one_remove(_next_list);
        //console.log(_step);
        if (_enable_same_next === false) {
            //console.log(_step);
            //console.log(_lag_data);
            if ($.inArray(_step, _lag_data) > -1) {
                //console.log(["不允許相同的步驟", _lag_data, _step])
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
        throw ["predict_result無路可走", _next_list];
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
        //console.log(["踢掉一樣的路徑", _last_y, _predict_result[_i].step]);
        _i++;
    }
    
    if (typeof(_predict_result[_i]) === "undefined") {
        throw ["沒有可以選擇的路徑了", _next_list];
    }
    
    return _predict_result[_i];
};

// ---------------------------------------------

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

DGP.defuzzication_target_martix = function (_target_data, _target_dict) {
    if (typeof(_target_data) !== "object") {
        return _target_data;
    }
    else {
        _target_data = _target_data[0];
        
        //console.log(["預測結果", _target_data.join("|")]);
        
        // 這時候應該會有兩個值
        var _result = 0;
        //DGP.console_log("defuzzication_target_martix", _target_data);
        var _r = {};
        for (var _i = 0; _i < _target_data.length; _i++) {
            var _key = _target_dict[_i];
            /*
            if (_i === 0) {
                _result = _result + _target_data[_i];
            }
            else {
                _result = _result + _target_data[_i];
            }
            */
            if (_key === "_end_distance") {
                _result = _result + _target_data[_i] * 0.01;
            }
            else if (_key === "_finish") {
                _result = _result + _target_data[_i] * 100;
            }
            else {
                _result = _result + _target_data[_i];
            }
            _r[_key] = _result;
        }
        console.log(JSON.stringify(_r));
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
DGP.build_predict_function = function (_model_type) {
    var _train_data = DGP.model_data.train;
    var _target_data = DGP.model_data.target;
    var _train_rdict = DGP.build_matrix_dict(_train_data);
    //DGP.console_log("train_rdict", _train_rdict);
    
    var _numeric_train_data = DGP.convert_cat_to_numeric(_train_data, _train_rdict);
    //DGP.console_log("numeric_train_data", _numeric_train_data[0]);
    
    //var _target_rdict = DGP.build_matrix_dict(_target_data);
    var _target_dict = DGP.build_lag_dict(_target_data);
    var _target_rdict = DGP.reverse_dict(_target_dict);
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
        var _result = DGP.defuzzication_target_martix(_target_data, _target_dict);
        return _result;
    };
    
    return _predict_function;
};

// -------------------------------

DGP.add_fail_path_to_model_data = function (_user_profile, _fail_path) {
    var _lag_length = DGP.config.lag_length;
    var _start_i = _fail_path.length - parseInt(_lag_length * 2);
    if (_start_i < 0) {
        _start_i = 0;
    }
    
    for (var _i = _start_i; _i < _fail_path.length; _i++) {
        var _lag_data = [];
        for (var _j = _lag_length - 1; _j >= 0; _j--) {
            var _current_index = _i - _j;
            var _seq = DGP.create_null_seq();
            if (typeof(_fail_path[_current_index]) !== "undefined") {
                _seq = JSON.parse(_fail_path[_current_index]);
            }
            _lag_data.push(_seq);
        }
        
        var _train_data = DGP.build_train_data(_lag_data, _user_profile);
        DGP.model_data.train.push(_train_data);
        
        var _target_data = DGP.create_fail_target_data();
        DGP.model_data.target.push(_target_data);
        
        //console.log(["生成失敗案例", _train_data, _target_data]);
        //throw "生成失敗案例 結束";
    }
};

DGP.build_train_data = function (_lag_data, _user_profile) {
    //var _profile_weight = DGP.config.max_sequence_length;
    
    var _d = {};
    for (var _j = 0; _j < _lag_data.length; _j++) {
        for (var _s in _lag_data[_j]) {
            if (_s === "time") {
                continue;
            }

            var _key = DGP.build_lag_key(_j, _s);
            var _value = _lag_data[_j][_s];
            _d[_key] = _value;
        }
    }

    // 加入profile的資料
    for (var _p in _user_profile) {
        _d[_p] = _user_profile[_p];
    }
    
    return _d;
};

DGP.create_fail_target_data = function () {
    var _target = FPF_ARRAY.array_clone(DGP.model_data.target[0]);
    _target["_finish"] = 0;
    _target["_end_distance"] = 0;
    return _target;
};