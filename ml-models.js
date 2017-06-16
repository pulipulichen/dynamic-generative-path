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

MODELS.build_mlp_model = function (_x, _y) {
    var _hl_config = FPF_FORM.get_checked_value("config_mlp_hidden_layer_sizes");
    var _hl = [_x[0].length-1];
    if (_hl_config === "config_mlp_hidden_layer_sizes_custom") {
        _hl = $("#mlp_hidden_layer_sizes").val().split(",");
    }
    
    var mlp = new ml.MLP({
        'input' : _x,
        'label' : _y,
        'n_ins' : _x[0].length,
        'n_outs' : _y[0].length,
        'hidden_layer_sizes' : _hl
    });

    mlp.set('log level',1); // 0 : nothing, 1 : info, 2 : warning.

    var _lr = FPF_FORM.get_value_float("#config_mlp_lr");
    var _epochs = FPF_FORM.get_value_float("#config_mlp_epochs");

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