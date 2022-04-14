var bannerCrop = $('#banner-crop-display').croppie({
    viewport: {
        width: 950,
        height: 200,
        type:'square'
    },
    boundary:{
        width: 1000,
        height: 250
    }
});
var avatarCrop = $('#avatar-crop-display').croppie({
    viewport: {
        width: 500,
        height: 500,
        type:'square'
    },
    boundary:{
        width: 650,
        height: 650
    }
});
$('#banner-input').on('change', function(){
    var reader = new FileReader();
    reader.onload = function (event) {
        bannerCrop.croppie('bind', {
            url: event.target.result,
        });
    }
    reader.readAsDataURL(this.files[0]);
    $('#banner-change-modal').modal('show');
});
$('.crop-banner').click(function(event){
    bannerCrop.croppie('result', {type: 'base64', format: 'png'}).then(function(img) {
        $.post('/banner/upload', {payload: img}, function(result) {
        }).fail(function(err) {
            console.log(err);
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
        $('#banner').attr('style', 'background-image: url("'+img+'");');
        $.toast({text: 'Banner changed successfully', loader: false, bgColor:"#6272a4"}) 
    });
    $('#banner-change-modal').modal('hide');
});
$('#avatar-input').on('change', function(){
    var reader = new FileReader();
    reader.onload = function (event) {
        avatarCrop.croppie('bind', {
            url: event.target.result,
        });
    }
    reader.readAsDataURL(this.files[0]);
    $('#avatar-change-modal').modal('show');
});
$('.crop-avatar').click(function(event){
    avatarCrop.croppie('result', {type: 'base64', format: 'png'}).then(function(img) {
        $.post('/user/avatar', {payload: img}, function(result) {
        }).fail(function(err) {
            console.log(err);
            $.toast({text: err.responseText, loader: false, bgColor:"#6272a4"}) 
        });
        $('.avatar').attr('src', img);
        $.toast({text: 'Avatar changed successfully', loader: false, bgColor:"#6272a4"}) 
    });
    $('#avatar-change-modal').modal('hide');
});