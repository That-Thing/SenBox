window.onload = function() {
    $('#generate-invite').click(function() { 
        $.post('/invites/generate', {"maxUses": $('#max-uses').val()}, function(result) {
            if (result.invite) {
                $("#generated-invite").text("Invite: "+result.invite);
                $.toast({text: "Invite generated", loader: false, bgColor:"#6272a4"})
            } else {
                console.log(result.status);
                console.log(result);
                $.toast({text: result.output, loader: false, bgColor:"#6272a4"}) 
            }
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    })
    $("#generated-invite").click(function() {
        navigator.clipboard.writeText(`${window.location['origin']}/register?invite=${$("#generated-invite").text().split(" ")[1]}`);
        $.toast({text: "URL copied to clipboard", loader: false, bgColor:"#6272a4"})
    })
    $('.invite').click(function() {
        navigator.clipboard.writeText(`${window.location['origin']}/register?invite=${this.id}`);
        $.toast({text: "URL copied to clipboard", loader: false, bgColor:"#6272a4"})        
    })
}