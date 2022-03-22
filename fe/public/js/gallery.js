$(function(ready){
    $("#order-by").change(function() { 
        console.log("order-by changed");
        var query = $(this).val(); 
        if (query) { 
            window.location = $(location).attr('href').split("?")[0]+"?sort="+query;
        }
        return false;
    });
});