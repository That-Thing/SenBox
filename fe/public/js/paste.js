window.onload = function() {
    $('#paste-submit').click(function() { 
        var pasteContent = $('#paste-input').val();
        var pasteTitle = $('#paste-title').val();
        var pasteBurn = 'off';
        var pastePassword = $('#paste-password').val();
        if ($('#paste-burn').is(':checked')) {
            pasteBurn = 'on';
        }
        var pasteSyntax = $("#syntax-select").val();
        if (pasteContent == '') {
            $.toast({text: 'Paste body cannot be blank', loader: false, bgColor:"#6272a4"}) 
            return;
        }
        $.post('/paste', {"title":pasteTitle, "content":pasteContent, "burn": pasteBurn, "syntax": pasteSyntax, "password": pastePassword}, function(result) {
            if (result.url) {
                $("#paste-url").text(window.location['href'].split('/')[2]+result.url);
                $("#paste-modal").modal("show");
            } else {
                console.log(result.status);
                console.log(result);
                $.toast({text: result.output, loader: false, bgColor:"#6272a4"}) 
            }
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    })
    $("#paste-url").click(function() {
        navigator.clipboard.writeText("https://"+$("#paste-url").text());
        $.toast({text: "URL copied to clipboard", loader: false, bgColor:"#6272a4"})
    })
}