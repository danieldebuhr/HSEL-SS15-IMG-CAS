
$("document").ready(function() {

    // Fenstergröße des Chats einstellen
    resizeWindow();

    var frame = $("#main_frame");

    frame.resize(function() {
        resizeWindow();
    });

    frame.draggable();
    frame.resizable();
    $("#whosonline").draggable();

    var sendVideo = false;
    var gesperrt = false;

    socket.on("webcam", function(data) {
        if(!gesperrt) {
            if (!$("#webcam_" + data.user.id).length) {
                gesperrt = true;
                createNewWebcam(data.user, function () {
                    $("#webcam_receiver_" + data.user.id)
                        .attr('src', data.pic);
                    gesperrt = false;
                })
            } else {
                $("#webcam_receiver_" + data.user.id)
                    .attr('src', data.pic);
            }
        }

        //console.log('Received data');
    });


    $("#startwebcam").click(function() {

        $("#startwebcam").fadeOut();
        $("#stopwebcam").fadeIn();

        sendVideo = true;

        var c_width = 320;
        var c_height = 240;

        // Setup elements
        var canvas = document.getElementById('preview');
        var canvas_2d_context = canvas.getContext('2d');
        var video = document.getElementById('client');

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
        if (navigator.getUserMedia) {

            navigator.getUserMedia({video: true}, function(stream) { video.src = window.URL.createObjectURL(stream); }, function(error) { console.log('Capture error ' + error); });

            function draw(v, ctx, w, h) {
                ctx.drawImage(v, 0, 0, w, h);
                socket.emit('webcam', canvas.toDataURL("image/jpg", 0.1));
                if(sendVideo) setTimeout(function() { draw(v, ctx, w, h); }, 500);
            }
            draw(video, canvas_2d_context, c_width, c_height);
        }

    });
    $("#stopwebcam").click(function() {
        $("#startwebcam").fadeIn();
        $("#stopwebcam").fadeOut();
        sendVideo = false;
    });

});

/**
 * Stellt die Fensterrgröße des Chat-Fensters ein
 */
function resizeWindow() {
    var frame = $("#main_frame");
    $("#main_chat").css("height", frame.height() - 122);
    $("#main_userinput").css("width", frame.width() - 62);
    chatScrollTop($("#main_chat"));
}

function createNewWebcam(user, callback) {

    var user_id = user.id;

    var newReceiver = $("<img/>", {
        id: "webcam_receiver_" + user_id,
        src: "",
        class: 'webcamimage',
        width: 320,
        height: 240
    });

    var newFrame = $("<div/>", {
        class: 'panel panel-default webcamframe'
    });

    var newPanelBody = $("<div/>", {
        id: "webcam_" + user_id,
        class: 'panel-body'
    });

    var newChatTitle = $("<div/>", {
        id: "webcam_windowtitle_" + user_id,
        class: 'panel-heading'
    });

    var newChatTitleH3 = $("<h3/>", {
        id: "webcam_windowtitleh3_" + user_id,
        class: 'panel-title'
    });

    newChatTitleH3.html(user.username);
    newChatTitleH3.appendTo(newChatTitle);
    newChatTitle.appendTo(newFrame);

    newReceiver.appendTo(newPanelBody);
    newPanelBody.appendTo(newFrame);


    newFrame.appendTo($("#before"));
    newFrame.draggable();


    callback();

}
