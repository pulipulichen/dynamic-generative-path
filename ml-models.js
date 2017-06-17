MODELS = {};

MODELS._saved_model = null;

MODELS.get_model = function () {
    return MODELS._saved_model;
};

MODELS.set_model = function (_model) {
    this._saved_model = _model;
    return this;
};

MODELS.reset_model = function () {
    //console.log("清除模型");
    MODELS._saved_model = null;
    return this;
};

// ----------------------

MODELS.build_random_model = function (_x, _y) {
    var _model = {predict: function () {
        return Math.random();
    }}; 
    this.set_model(_model);
    return _model;
};

/**
 * https://github.com/junku901/machine_learning/blob/master/lib/mlp.js
 * @param {type} _x
 * @param {type} _y
 * @returns {MODELS.build_mlp_model.mlp|ml.MLP}
 */
MODELS.build_mlp_model = function (_x, _y) {
    var _hidden_layer_sizes_config = FPF_FORM.get_checked_value("config_mlp_hidden_layer_sizes");
    
    var _hidden_layer_sizes = [_x[0].length, _y[0].length];
    //var _hidden_layer_sizes = [_x[0].length];
    //var _hidden_layer_sizes = [_x[0].length - 1];
    
    if (_hidden_layer_sizes_config === "config_mlp_hidden_layer_sizes_custom") {
        _hidden_layer_sizes = $("#mlp_hidden_layer_sizes").val().split(",");
    }
    
    var mlp = new ml.MLP({
        'input' : _x,
        'label' : _y,
        'n_ins' : _x[0].length,
        'n_outs' : _y[0].length,
        'hidden_layer_sizes' : _hidden_layer_sizes
    });

    mlp.set('log level', 1); // 0 : nothing, 1 : info, 2 : warning.
    //mlp.set('log level', 0); // 0 : nothing, 1 : info, 2 : warning.

    var _lr = FPF_FORM.get_value_float("#config_mlp_lr");
    var _epochs = FPF_FORM.get_value_float("#config_mlp_epochs");
    _epochs = _epochs * _x.length;

    mlp.train({
        'lr' : _lr,
        'epochs' : _epochs
    });
    
    this.set_model(mlp);
    
    return mlp;
};

// -------------------------

$(function () {
    $(".reset-saved-model").change(MODELS.reset_model);
});