Dropzone.autoDiscover = false;
window.onload = function() {
    Dropzone.options.myDropzone = false;
    var myDropzone = new Dropzone("#dropzone", {
        url: "upload",
        dictDefaultMessage: "Select or drop files here to upload",
        paramName: "file",
        clickable: true,
        addRemoveLinks: true,
    });

    myDropzone.on("complete", function(file) {
        //console.log(file);
    });
    myDropzone.on("success", function(file, responseText) {
        console.log(file); // console should show the ID you pointed to
        // do stuff with file.id ...
    });
};