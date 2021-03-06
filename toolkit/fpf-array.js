FPF_ARRAY = {};

/**
 * 隨機挑出一個變項
 * @param {Array} _array
 * @returns {Object}
 */
FPF_ARRAY.array_pick_random_one = function (_array) {
    return _array[Math.floor(Math.random() * _array.length)];
};

/**
 * 隨機挑出一個變項，把它從陣列中刪除
 * @param {Array} _array
 * @returns {Object}
 */
FPF_ARRAY.array_pick_random_one_remove = function (_array) {
    var _i = Math.floor(Math.random() * _array.length);
    var _rand = _array[_i];
    _array.splice(_i, 1);
    /*
    return {
        rand: _rand,
        array: _array
    };
    */
    return _rand;
};

// ------------------------

/**
 * 完整複製陣列
 * @param {Array} _array
 * @returns {Array}
 */
FPF_ARRAY.array_clone = function (_array) {
    try {
        return JSON.parse(JSON.stringify(_array));
    }
    catch (_e) {
        //throw ["Array clone failed", _array];
        return [];
    }
    
};

FPF_ARRAY.get_last = function (_array) {
    return _array[(_array.length-1)];
};