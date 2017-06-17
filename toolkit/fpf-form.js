FPF_FORM = {};

FPF_FORM.get_value_float = function (_selector) {
    var _value = $(_selector).val();
    return eval(_value);
};

FPF_FORM.get_value_int = function (_selector) {
    var _value = $(_selector).val();
    return parseInt(_value, 10);
};

FPF_FORM.get_checked_value = function (_name) {
    var _value = $('input[name="' + _name + '"]:checked').val();
    return _value;
};