var image_crop = $('#banner-crop-display').croppie({
    viewport: {
        width: 150,
        height: 200,
        type:'square'
    },
    boundary:{
        width: 1000,
        height: 250
    }
});
$('#banner-input').on('change', function(){
    var reader = new FileReader();
    reader.onload = function (event) {
        image_crop.croppie('bind', {
            url: event.target.result,
        });
    }
    reader.readAsDataURL(this.files[0]);
    $('#banner-change-modal').modal('show');
});
$('.crop_image').click(function(event){
    image_crop.croppie('result', {type: 'base64', format: 'png'}).then(function(img) {
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