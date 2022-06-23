Dropzone.autoDiscover = false;
window.onload = function() {
    Dropzone.options.myDropzone = false;
    var myDropzone = new Dropzone("#dropzone", {
		maxFilesize: 5000,
        url: "upload",
        dictDefaultMessage: "Select or drop files here to upload",
        paramName: "file",
        clickable: true,
        addRemoveLinks: true,
    });
    myDropzone.on("success", function(file, responseText) {
        console.log(responseText);
    })
};

$(".mbox").each(function() {
    $(this).click(function() {
        navigator.clipboard.write($(this)).then(function() {
            $(this).text("Copied url...");
        });
    });
    
});