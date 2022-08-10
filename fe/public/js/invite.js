window.onload = function() {
    $('#generate-invite').click(function() { 
        $.post('/invites/generate', {"maxUses": $('#max-uses').val()}, function(result) {
            if (result.invite) {
                $("#generated-invite").text("Invite: "+result.invite);
                $("#invites-left").text(parseInt($("#invites-left").text())-1);
                $("#invite-list").append(`<div> <span class="me-2 invite new-invite text-success" id="${result.invite}">${result.invite}</span><span>Uses: 0/${result.maxUses}</span></div>`);
                $.toast({text: "Invite generated", loader: false, bgColor:"#6272a4"})
                $('.new-invite').click(function() {
                    navigator.clipboard.writeText(`${window.location['origin']}/register?invite=${this.id}`);
                    $.toast({text: "URL copied to clipboard", loader: false, bgColor:"#6272a4"})        
                })
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
        if($("#generated-invite").text()) {
            navigator.clipboard.writeText(`${window.location['origin']}/register?invite=${$("#generated-invite").text().split(" ")[1]}`);
            $.toast({text: "URL copied to clipboard", loader: false, bgColor:"#6272a4"})
        }
    })
    $('.invite').click(function() {
        navigator.clipboard.writeText(`${window.location['origin']}/register?invite=${this.id}`);
        $.toast({text: "URL copied to clipboard", loader: false, bgColor:"#6272a4"})        
    })
}