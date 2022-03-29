window.onload = function() {
    $('#paste-submit').click(function() { 
        console.log("test");
        var pasteContent = $('#paste-input').val();
        var pasteTitle = $('#paste-title').val();
        var pasteBurn = $('#paste-burn').val();
        var pasteSyntax = $("#syntax-select").val();
        if (pasteContent == '') {
            $.toast({text: 'Paste body cannot be blank', loader: false, bgColor:"#6272a4"}) 
            return;
        }
        $.post('/paste', {"title":pasteTitle, "content":pasteContent, "burn": pasteBurn, "syntax": pasteSyntax}, function(result) {
            if (result[0] == 'url') {
                //Open modal with returned paste url that can be clicked to copy to clipboard
                console.log(result);
            } else {
                console.log(result.status);
                console.log(result);
                $.toast({text: result.output, loader: false, bgColor:"#6272a4"}) 
            }
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    })
}