$(document).ready(function(){
    $("#log-in-button").on("click", function(){
        $.post('/auth', {
            username: $("#username").val(),
            password: $("#password").val()
        }, function(result) {
            $.toast({text: "Logged in", loader: false, bgColor:"#6272a4"})
            window.location.replace("/home");
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    });
});