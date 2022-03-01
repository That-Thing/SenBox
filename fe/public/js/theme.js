function setTheme(theme) {
    $.cookie("theme", theme);
    if(theme == "dark") {
        $("#theme-button").attr('onClick', 'setTheme("light")');
        $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
    } else {
        $("#theme-button").attr('onClick', 'setTheme("dark")');
        $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
    } 
    
};