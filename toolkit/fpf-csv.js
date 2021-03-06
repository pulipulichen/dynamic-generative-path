FPF_CSV = {};

/**
 * 輸入CSV，然後對CSV的每一列的資料進行處理
 * @param {String} _csv
 * @param {Function} _process = function(_row) {}
 * @returns {JSON}
 */
FPF_CSV.csv_each = function (_csv, _process) {
    var _lines = _csv.trim().split("\n");
    var _keys = [];
    var _result = [];
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
            _result.push(_row);
        }
    }
    return _result;
};
