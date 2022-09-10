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
    $("#regenerate-api-key").on("click", function(){
        $.post('/settings/api/regenerate', function(result) {
            $("#api-key").val(result.api_key);
            $.toast({text: "API key regenerated", loader: false, bgColor:"#6272a4"})
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    });
    $("#sharex-config").on("click", function(){
        $.get('/api/config/sharex?api_key='+$("#api-key").val(), function(result) {
            let sharex = JSON.stringify(result);
            navigator.clipboard.writeText(sharex).then(function() {
                $.toast({text: "ShareX config copied", loader: false, bgColor:"#6272a4"})
            });
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    });
});