
$("document").ready(function() {

    $("#frame").css("height", $(window).height() - 100);
    $("#chat").css("height", $("#frame").height() - 70);
    $("#chat").css("width", $(window).width() - 50);
    $("#userinput").css("width", $("#frame").width() - 62);


});


$(document).bind("touchmove",function(event){
    if (event.target.id == document.body.id || event.target.id == "frame") event.preventDefault();;
});


function resizeWindow() {
    //$("#frame").css("height", $( window ).height() / 2 );


}
