var _process_file = function(_callback) {
    _loading_enable(function () {
        var _result = DGP.main();

        // --------------------------
        // 完成
        _loading_disable();
        if (typeof (_callback) === "function") {
            _callback(_result);
        }
    
    }); // _loading_enable(function () {
};

// ---------------------

var _loading_enable = function (_callback) {
    $("#preloader").show().fadeIn("fast", "swing", _callback);
};

var _loading_disable = function () {
    $("#preloader").fadeOut().hide();
};

// -----------------------

$(function () {
    var _panel = $(".file-process-framework");
    //_panel.find(".input-mode.textarea").change(_load_textarea);
    _panel.find(".file-input").change(FPF_FILE.load_file);
    //_panel.find("#input_file_submit").click(_load_file);
    _panel.find(".download-file").click(FPF_DOWNLOAD.download_file_button);

    _panel.find('.menu .item').tab();
    _panel.find("button.copy-table").click(FPF_COPY.copy_table);
    _panel.find("button.copy-csv").click(FPF_COPY.copy_csv_table);

    // 20170108 測試用
    //_load_textarea();

    $.get("profile.csv", function (_csv) {
        $("#input_mode_profile").val(_csv);
        $.get("sequence.csv", function (_csv) {
            $("#input_mode_textarea_sequence").val(_csv);
            $.get("target.csv", function (_csv) {
                $("#input_mode_textarea_target").val(_csv);
                _process_file();
            });
        });
    });
});