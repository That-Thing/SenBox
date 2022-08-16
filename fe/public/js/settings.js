$(document).ready(function(){
    $("#unlink-discord").on("click", function(){
        $.post('/settings/auth/revoke', function(result) {
            $("#unlink-discord").replaceWith(function() {
                return `<a class="btn btn-sm btn-primary ms-1 w-25 mt-2" href=${$('#discord-link').val()} target="_blank"><i class="fa-brands fa-discord me-2"></i>Link Discord</a>`; 
            });
            $("#discord").remove();
            $.toast({text: "Discord unlinked", loader: false, bgColor:"#6272a4"})
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    });
    $("#change-password").on("click", function(){
        $.post('/settings/password', {
            oldPassword: $("#current-password").val(),
            repeatPassword: $("#repeat-password").val(),
            newPassword: $("#new-password").val()
        }, function(result) {
            $.toast({text: "Password updated", loader: false, bgColor:"#6272a4"})
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    });
});