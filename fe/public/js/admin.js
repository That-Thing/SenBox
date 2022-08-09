$(document).ready(function(){
    $("#mime-list").on("click", ".remove-mime", function(){
        $(this).parent().remove();
    });
    $("#banned-mimes").on("click", ".add-mime", function(){
        var html = `
        <span class="d-flex mime-field">
            <input autocomplete="off" class="form-control form-control-sm mt-1 ms-1 w-25 me-2 mime-input" type="text" placeholder="ex: application/zip" name="bannedMimes">
            <button class="btn btn-sm btn-danger mt-auto remove-mime" type="button"><i class="fa-solid fa-minus"></i></button>
        </span> 
        `;
        $("#mime-list").append(html);
    });
    $('#save-settings').click(function() {
        var name = $('#name').val();
        var description = $('#description').val();
        if($('#registrations').is(':checked')) {
            var registrations = 'on';
        } else {
            var registrations = 'off';
        }
        if($('#invites').is(':checked')) {
            var invites = 'on';
        } else {
            var invites = 'off';
        }
        var bannerSize = $('#bannerSize').val();
        var avatarSize = $('#avatarSize').val();
        var maxFileSize = $('#maxFileSize').val();
        var bannedMimes = [];
        $(".mime-input").each(function(){
            if($(this).val() != '') {
                bannedMimes.push($(this).val());
            }
        });
        $.post('/admin/update', {
            "name": name,
            "description": description,
            "registrations": registrations,
            "invites": invites,
            "bannerSize": bannerSize,
            "avatarSize": avatarSize,
            "maxFileSize": maxFileSize,
            "bannedMimes": bannedMimes
            }, function(result) {
                if (result.success == true) {
                    $.toast({text: "Settings updated", loader: false, bgColor:"#6272a4"}) 
                } else {
                    console.log(result.status);
                    console.log(result);
                    $.toast({text: result.output, loader: false, bgColor:"#6272a4"}) 
                }
        }).fail(function(err) {
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
    });
});