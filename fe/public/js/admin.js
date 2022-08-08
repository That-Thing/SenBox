$(document).ready(function(){
    $(".remove-mime").on("click", function(){
        $(this).parent().remove();
    });
    $(".add-mime").on("click", function(){
        var html = `
        <span class="d-flex mime-field">
            <input autocomplete="off" class="form-control form-control-sm mt-1 ms-1 w-25 me-2 mime-input" type="text" placeholder="ex: application/zip">
            <button class="btn btn-sm btn-danger mt-auto remove-mime" type="button"><i class="fa-solid fa-minus"></i></button>
        </span> 
        `;
        $("#mime-list").append(html);
    });
    
});