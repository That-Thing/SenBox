var image_crop = $('#banner-crop-display').croppie({
    viewport: {
        width: 900,
        height: 200,
        type:'square'
    },
    boundary:{
        width: 950,
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
    var formData = new FormData();
    image_crop.croppie('result', {type: 'blob', format: 'png'}).then(function(blob) {
        formData.append('cropped_image', blob);
        ajaxFormPost(formData, '/banner/upload');
    });
    $('#banner-change-modal').modal('hide');
});
function ajaxFormPost(formData, actionURL){
    $.ajax({
        url: actionURL,
        type: 'POST',
        data: formData,
        cache: false,
        async: true,
        processData: false,
        contentType: false,
        timeout: 5000,
        beforeSend: function(){
        },
        success: function(response) {
            if (response['status'] === 'success') {
                $('#banner-input').val("");
                $('#uploaded-image').attr('style', `background-image: url(${response['url']});`);
            } else {
                console.log(response['message']);
            }
        },
        complete: function(){
        }
    });
}