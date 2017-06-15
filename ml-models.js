MODELS = {};

MODELS._saved_model = undefined;

MODELS.get_model = function () {
    return this._saved_model;
};

MODELS.set_model = function (_model) {
    this._saved_model = _model;
    return this;
};

MODELS.reset_model = function () {
    this._saved_model = undefined;
    return this;
};

// ----------------------

MODELS.build_random_model = function (_x, _y) {
    return {predict: function () {
        return Math.random();
    }};
};

MODELS.build_mlp_model = function (_x, _y) {
    var mlp = new ml.MLP({
        'input' : _x,
        'label' : _y,
        'n_ins' : _x[0].length,
        'n_outs' : _y[0].length,
        'hidden_layer_sizes' : [_x[0].length-1]
    });

    mlp.set('log level',1); // 0 : nothing, 1 : info, 2 : warning.

    mlp.train({
        'lr' : 0.6,
        'epochs' : 50
    });
    
    return mlp;
};
