function setTheme(theme) {
    $.cookie("theme", theme);
    if(theme == "dark") {
        $("#theme-button").attr('onClick', 'setTheme("light")');
        $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
        $('.bg-light').removeClass('bg-light').addClass('bg-dark');
        $('.navbar-light').removeClass('navbar-light').addClass('navbar-dark');
        $('.theme-light').removeClass('theme-light').addClass('theme-dark');
    } else if(theme == "light") {
        $("#theme-button").attr('onClick', 'setTheme("dark")');
        $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
        $('.bg-dark').removeClass('bg-dark').addClass('bg-light');
        $('.navbar-dark').removeClass('navbar-dark').addClass('navbar-light');
        $('.theme-dark').removeClass('theme-dark').addClass('theme-light');

    } else {
        console.log("What do you think you're doing?");
    }
    
};