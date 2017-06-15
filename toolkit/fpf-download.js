FPF_DOWNLOAD = {};

FPF_DOWNLOAD.download_file_button = function () {
    var _btn= $(this);
    
    var _file_name = $(_btn.attr("download_filename_selector")).val();
    var _data = $(_btn.attr("download_data_selector")).val();
    
    FPF_DOWNLOAD.download_file(_data, _file_name, _btn.attr("download_type"));
};

FPF_DOWNLOAD.download_file = function (data, filename, type) {
    var a = document.createElement("a"),
        file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
};
