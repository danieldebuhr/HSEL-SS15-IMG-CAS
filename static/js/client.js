/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */

// Verbindung zum Server herstellen
var socket = io.connect();
//Hilfsvariablen
var chatScrollTimeout = null;
var scrollTime = 500;

// Mein Usernamme
var username = null;
var chat = null;
var typingTimeout = null;

// jQuery
$("document").ready(function() {

    // Wird oft verwendet, aus Performancegründen hier ein mal definiert
    chat = $("#main_chat");

    // Audio-Dateien
    plopp = document.createElement('audio');
    plopp.setAttribute('src', 'static/plopp.wav');
    typing = document.createElement('audio');
    typing.setAttribute('src', 'static/typing.wav');

    // Standardeingabefeld aus Performancegründen ein mal definiert
    userinput = $('#main_userinput');

    // Sendet die "typing"-Info an den Server, sobald Tasten gedrückt werden
    userinput.keyup(function (event) {
        if (event.which != 13) {
            socket.emit('typing');
        }
    });

    // Wird die Eingabeform mit RETURN abgesendet, wird dessen Inhalt an den Server gesendet
    $('#main_form').submit(function () {
        var userinput = $('#main_userinput');
        socket.emit('chat message', userinput.val());
        userinput.val('');
        return false;
    });

    // Die Bild-Senden funktion wird in diesem Block definiert und am "change"-Event des Inputfeldes gebunden
    $('#file').bind('change', function (e) {

        var file = $("#file");

        // Zufälliger Identifyer zur Beschreibung des Bildes und verschiedener Funktionen
        var identifyer = "pic-" + Math.random().toString(36).replace(/[^a-zA-Z0-9]+/g, '').substr(0, 5);

        // Die anderen Clients darüber informieren, dass ein neues Bild kommt (Ajax-Loader anzeigen)
        socket.emit('image incoming', identifyer);

        var data = file[0].files[0];

        // Daten lesen
        var reader = new FileReader();
        reader.onload = function (evt) {

            var result = reader.result;

            // Dateityp anhand des Dateinamens ermitteln
            type = result.substr(11, result.indexOf(";") - 11);

            // Alles außer gif-Bilder werden komprimiert auf maximal 400px Breite oder 300px Höhe,
            // damit auch Mobiltelefone Daten schnell senden können. Dazu wird ein sogenanntes
            // canvas erstellt, in dem das Bild erstellt und anschließend verkleinert wird.
            if(type != "gif") {

                var tempImg = new Image();
                tempImg.src = result;
                tempImg.onload = function () {

                    var width = 400;
                    var height = 300;
                    var pic_width = tempImg.width;
                    var pic_height = tempImg.height;
                    if (pic_width > pic_height) {
                        if (pic_width > width) {
                            pic_height *= width / pic_width;
                            pic_width = width;
                        }
                    } else {
                        if (pic_height > height) {
                            pic_width *= height / pic_height;
                            pic_height = height;
                        }
                    }

                    var canvas = document.createElement('canvas');
                    canvas.width = pic_width;
                    canvas.height = pic_height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(this, 0, 0, pic_width, pic_height);
                    var dataURL = canvas.toDataURL("image/jpeg", 0.5);

                    socket.emit('image', {image: dataURL, identifyer: identifyer});

                }

            } else {

                socket.emit('image', {image: result, identifyer: identifyer});

            }

        };
        reader.readAsDataURL(data);

    });

    // Hier werden die einzelnen Funktionen zu den socket-events definiert.
    socket.on('online', showOnline);
    socket.on('user-offline', removeUser);
    socket.on('isTyping', isTyping);
    socket.on('system message', systemMessage);
    socket.on('whoami', whoAmI);
    socket.on('message history', messageHistory);
    socket.on('image incoming', imageIncoming);
    socket.on('image', loadImage);
    socket.on('chat message', chatMessage);
    socket.on('private message', privateMessage);

});

/**
 * Socket-IO Event - Empfängt, welcher User online ist und stellt diese dar.
 * @param online Array mit Benutzern
 */
function showOnline(online) {
    if(online.length > 0) {
        for(i = 0; i<=online.length-1; i++) {
            addUserOnline(online[i]);
        }
    }
}

/**
 * Fügt einen Benutzer der Wer ist Online-Liste hinzu.
 * @param user Benutzerobjekt
 */
function addUserOnline(user) {
    setTimeout(function() {
        if(!$("#online_" + user.id).length) {
            $("#whosonline_body").append("<li id='online_" + user.id + "' style='display: none; cursor:pointer;'>" + user.username + "</li>");
            setTimeout(function() {
                $("#online_" + user.id).fadeIn();
                $("#online_" + user.id).click(function() {
                    if(!$("#chat_" + user.id).length) {
                        startPrivateChat(user);
                    }
                });
            }, 100);
        }
    }, 100);
}

/**
 * Socket.IO Event - Empfängt eine persönliche Nachricht
 * @param msg
 */
function privateMessage(msg) {

    if(!$("#chat_" + msg.user.id).length) {
        startPrivateChat(msg.user, function() {
            chatMessage(msg, false, $("#chat_" + msg.user.id));
        });
    } else {
        chatMessage(msg, false, $("#chat_" + msg.user.id));
    }



}

/**
 * Startet einen privaten Chat und erstellt das entsprechende Fenster.
 * @param user Benutzerobjekt
 * @param callback Nach Abschluss der Darstellung wird der callback aufgerufen.
 */
function startPrivateChat(user, callback) {

    var user_id = user.id;

    var outerFrame = $("<div/>", {
        id: "outerframe_" + user_id,
        style: 'position: absolute'
    });

    var newFrame = $("<div/>", {
        id: "frame_" + user_id,
        class: 'panel panel-default',
        style: 'display: none;'
    });

    var newPanelBody = $("<div/>", {
       id: "panelbody_" + user_id,
        class: 'panel-body'
    });

    var newChat = $("<div/>", {
        id: "chat_" + user_id,
        class: 'chat'
    });

    var closeImg = $("<img/>", {
        id: "close_" + user_id,
        class: "closeimage",
        src: 'static/images/close.gif'
    });

    var newChatTitle = $("<div/>", {
        id: "windowtitle_" + user_id,
        class: 'panel-heading'
    });

    var newChatTitleH3 = $("<h3/>", {
        id: "windowtitleh3_" + user_id,
        class: 'panel-title'
    });

    var newUserinput = $("<input/>", {
        id: "userinput_" + user_id,
        class: 'userinput',
        placeholder: 'Deine Nachricht...',
        autocomplete: 'false'
    });

    var newForm = $("<form/>", {
        id: 'form_' + user_id
    });


    newChatTitleH3.appendTo(newChatTitle);
    newChatTitle.appendTo(newFrame);
    newChat.appendTo(newPanelBody);
    newPanelBody.appendTo(newFrame);
    newUserinput.appendTo(newForm);
    newForm.appendTo(newPanelBody);
    newFrame.appendTo(outerFrame);
    outerFrame.appendTo($("#before"));

    // Mit setTimeout dafür sorgen, dass die folgenden Aufgaben im Eventloop warten müssen
    setTimeout(function() {

        newChatTitleH3.text(user.username);
        //closeImg.appendTo(newChatTitle);

        newFrame.css("height", "200px");
        //newFrame.css("top", "-500px");
        newFrame.css("left", "600px");

        newChat.css("height", newFrame.height() - 112);
        newUserinput.css("width", newFrame.width() - 40);

        newFrame.resizable();

        newFrame.resize(function() {
            newChat.css("height", newFrame.height() - 112);
            newUserinput.css("width", newFrame.width() - 40);
        });

        newForm.submit(function () {
            socket.emit('private message', {recipient: user_id, data: newUserinput.val()});
            chatMessage({user: {username: username}, data: newUserinput.val(), time: new Date()}, true, $("#chat_" + user_id));
            newUserinput.val('');
            return false;
        });

        //closeImg.click(function() {
        //   newFrame.fadeOut();
        //});

        newFrame.draggable();

        setTimeout(function() {
            newFrame.fadeIn();
        }, 200);

        if(callback) {
            callback();
        }

    }, 100);


}

/**
 * Socket.IO Event - geht ein User offline, muss er aus der Liste der Online-User entfernt werden.
 * @param offline
 */
function removeUser(offline) {
    if($("#online_" + offline.id).length) {
        $("#online_" + offline.id).remove();
    }
}

/**
 * Socket.IO Event - Wird ausgeführt, wenn andere Benutzer am Tippen sind um darüber zu informieren
 * @param msg
 */
function isTyping(msg) {

    if($("#" + msg).html()!=(msg + " is typing...")) {
        typing.play();
        chat.append($('<li id='+msg+' class="typing">').text(msg + " is typing..."));
        chat.animate({
            scrollTop: chat.get(0).scrollHeight
        });
        if(typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
            $("#" + msg).remove();
        }, 4000);
    }

}

/**
 * Socket-IO Event - Wird ausgeführt, wenn eine Nachricht kommt. Wird auch an anderer Stelle ausgeführt,
 * um Nachrichten hinzuzufügen.
 * @param msg message-Objekt vom Server
 * @param isHistory true/false, ob es sich um History-Nachrichten handelt
 * @param chatWindow Ziel-Fenster
 */
function chatMessage(msg, isHistory, chatWindow){

    if(!chatWindow) chatWindow = chat;

    // Benutzername extrahieren
    user = msg.user.username;

    // Zeit der Nachricht lesen und schön machen
    time_string = getChatTime(new Date(msg.time));

    if(!isHistory) {
        if ($("#" + user).html() == (user + " is typing...")) {
            $("#" + user).remove();
        }
        if (user != username)
            plopp.play();
    }

    // Nachricht dem Chat Fenster hinzufügen
    chatWindow.append($('<li>').html(time_string + " "  +user + ": " + replaceSmileys(msg.data)));

    if(!isHistory) scrollTime = 100;
    chatScrollTop(chatWindow);

}

/**
 * Socket.IO Event - Wird ausgeführt, wenn System-Nachrichten erscheinen sollen. Wird auch an andere Stelle ausgeführt.
 * @param msg Message-Objekt
 */
function systemMessage(msg){
    chat.append("<li class='system'>" + msg + "</li>");
    chat.animate({
        scrollTop: chat.get(0).scrollHeight
    });
}

/**
 * Socket.IO Event - Informiert den Benutzer darüber, wer er ist (authentifiziert auf der Loginseite)
 * @param user Username
 */
function whoAmI(user) {
    username = user;
}

/**
 * Socket.IO Event - Informiert den Client, dass gleich ein Bild kommt und erstellt ein Wartesymbol.
 * @param msg Message-Objekt
 */
function imageIncoming(msg) {

    time_string = getChatTime(new Date(msg.time));

    chat.append("<table id='table_"+msg.identifyer+"' style='display: none;'><tr><td valign='middle'>" +
        time_string +
        " " +msg.user.username+": " +
        "</td><td>" +
        "<img id='"+msg.identifyer+"' class='image' src='static/images/loader.gif'/>" +
        "</td></tr></table>");

    var tableimage = $("#table_" + msg.identifyer);
    tableimage.fadeIn();

    chatScrollTop(chat);

}

/**
 * Gibt einen formatierten String für die Nachrichten-Zeit zurück
 * @param time Date-Objekt
 * @returns {string}
 */
function getChatTime(time) {
    time_hours = ((time.getHours() < 10) ? "0" + time.getHours() : time.getHours());
    time_minutes = ((time.getMinutes() < 10) ? "0" + time.getMinutes() : time.getMinutes());
    return "<small>[" + time_hours + ":" + time_minutes + "]</small>";

}

/**
 * Socket.IO Event - Läd das eigentliche Bild in den Chat
 * @param img
 */
function loadImage (img) {
    var image = $("#" + img.identifyer);
    image.fadeOut(function() {
        image.attr("src", img.data);
        image.fadeIn("fast");
    });
    chatScrollTop(chat);
}

/**
 * Socket.IO Event - Eine Liste der letzten Nachrichten, die bei Verbindungsherstellung gesendet wird.
 * @param messages Array mit Message-Objekten
 */
function messageHistory(messages) {

    if(messages.length > 0) {
        for (i = 0; i <= messages.length - 1; i++) {

            if (messages[i].type == "message") {
                chatMessage(messages[i], true);
            } else if (messages[i].type == "image") {
                imageIncoming(messages[i]);
            }
        }
    }
}

/**
 * Lässt das Chat-Window nach unten Scrollen.
 * @param chatWindow verweis auf das Chat-Div
 */
function chatScrollTop(chatWindow) {
    if(chatScrollTimeout) clearTimeout(chatScrollTimeout);
    chatScrollTimeout = setTimeout(function() {
        chatWindow.animate({
            scrollTop: chat.get(0).scrollHeight
        });
    }, scrollTime);
}

/**
 * Ersetzt einige Text-Smileys mit Bildern.
 * @param text Eingabetext
 * @returns string Ausgabetext
 */
function replaceSmileys(text) {

    var smileys = {
        'smiley':   [":-)", "smiley.png"],
        'smiley2':  [":)", "smiley.png"],
        'sad' :     [":-(", "sad.png"],
        'sad2' :    [":(", "sad.png"]
    };

    for(var key in smileys)
        if(text.indexOf(smileys[key][0]) != -1)
            text = text.replace(smileys[key][0], "<img src='static/smiley/"+smileys[key][1]+"' />");

    return text;
}

