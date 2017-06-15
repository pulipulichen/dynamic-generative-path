FPF_FILE = {};

FPF_FILE.load_file = function(evt) {
    //console.log(1);
    if(!window.FileReader) return; // Browser is not compatible

    var _panel = $(".file-process-framework");
    
    _panel.find(".loading").removeClass("hide");

    var reader = new FileReader();
    var _result;

    var _original_file_name = evt.target.files[0].name;
    var _pos = _original_file_name.indexOf(".");
    var _file_name = _output_filename_prefix + _original_file_name.substr(0, _pos);
    _file_name = _file_name + _output_filename_ext;
    
    _panel.find(".filename").val(_file_name);
    
    reader.onload = function(evt) {
        if(evt.target.readyState !== 2) return;
        if(evt.target.error) {
            alert('Error while reading file');
            return;
        }

        //filecontent = evt.target.result;

        //document.forms['myform'].elements['text'].value = evt.target.result;
        _result =  evt.target.result;
        _file_temp = _result;
        _start_process_file();
    };
    
    
    var _start_process_file = function () {
        _process_file(_result, undefined, function (_result) {
            _panel.find(".preview").val(_result);
                        
            $(".file-process-framework .myfile").val("");
            $(".file-process-framework .loading").addClass("hide");
            _panel.find(".display-result").show();
            _panel.find(".display-result .encoding").show();

            var _auto_download = (_panel.find('[name="autodownload"]:checked').length === 1);
            if (_auto_download === true) {
                _panel.find(".download-file").click();
            }
            
            //_download_file(_result, _file_name, "txt");
        });
    };

    //console.log(_file_name);

    reader.readAsText(evt.target.files[0]);
};

// --------------------------------------

FPF_FILE.load_file_buffer = function(evt) {
    //console.log(1);
    if(!window.FileReader) return; // Browser is not compatible

    var _panel = $(".file-process-framework");
    
    _panel.find(".loading").removeClass("hide");

    var reader = new FileReader();
    var _result_buffer;

    reader.onload = function(evt) {
        if(evt.target.readyState !== 2) return;
        if(evt.target.error) {
            alert('Error while reading file');
            return;
        }

        //filecontent = evt.target.result;

        //document.forms['myform'].elements['text'].value = evt.target.result;
        _result_buffer =  evt.target.result;
        _result =  _file_temp;
        if (_result === undefined) {
            $(".file-process-framework .myfile_buffer").val("");
            alert("Test ARFF is not ready.");
            return;
        }
        _start_process_file();
    };
    
    
    var _start_process_file = function () {
        _process_file(_result, _result_buffer, function (_result) {
            _panel.find(".preview").val(_result);
                        
            $(".file-process-framework .myfile_buffer").val("");
            $(".file-process-framework .loading").addClass("hide");
            _panel.find(".display-result").show();
            _panel.find(".display-result .encoding").show();

            var _auto_download = (_panel.find('[name="autodownload"]:checked').length === 1);
            if (_auto_download === true) {
                _panel.find(".download-file").click();
            }
            
            //_download_file(_result, _file_name, "txt");
        });
    };

    //console.log(_file_name);

    reader.readAsText(evt.target.files[0]);
};
