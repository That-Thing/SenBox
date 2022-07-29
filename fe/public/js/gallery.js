$(function(ready){
    $("#order-by").change(function() { 
        console.log("order-by changed");
        var query = $(this).val(); 
        if (query) { 
            window.location = $(location).attr('href').split("?")[0]+"?sort="+query;
        }
        return false;
    });
    $(".file-url").click(function() {
        var url = $(this).attr("url");
        navigator.clipboard.writeText(`${window.location['origin']}/${url}`);
        $.toast({text: "File URL copied to clipboard", loader: false, bgColor:"#6272a4"})
    });
});