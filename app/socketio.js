/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */

var passportSocketIo    = require("passport.socketio");   // Passport Authentifizierung für Socket.io
var messageHandler = require('./messagehandler.js');

// Wer-ist-online Liste
var online = [];

// Array für alle verbundenen Sockets
var socketlist = [];

module.exports = function(app, sessionStore) {

    app.io.set('authorization', passportSocketIo.authorize({
        key:    'connect.sid',       //the cookie where express (or connect) stores its session id.
        secret: 'diesisteinegeileappyo', //the session secret to parse the cookie
        store:   sessionStore,     //the session store that express uses
        fail: onAuthorizeFail,
        success: onAuthorizeSuccess
    }));

    /**
     * User stellt eine Verbindung mit dem Server her.
     * Alles innerhalb dieser Funktion geschieht im speziellen Kontext DIESES Benutzers.
     */
    app.io.on('connection', function(socket) {

        // Eigenes User Objekt speichern
        var me = socket.handshake.user;

        // Objekt mit Informationen über mich anlegen
        // Dieses Objekt in dem "weristonline"-Array speichern
        var me_obj = {username: me.username, id: me._id};
        online.push(me_obj);

        // Objekt mit meiner ID und meinem Socket anlegen
        // Dieses Objekt in der Socketliste speichern (für private Nachrichten)
        var me_obj_socket = {id: me._id, sock: socket};
        socketlist.push(me_obj_socket);

        // Alle Informieren, dass ich online bin
        app.io.broadcast('system message',  me.username + " hat den Chat betreten.");

        // Den "weristonline"-Array an alle senden
        app.io.broadcast('online', online);

        // Mir selber sagen, wie ich heiße
        socket.emit('whoami', me.username);

        // Mir die letzten 10 Nachrichten schicken (History)
        emitHistory(socket);

        /**
         * Wenn ich disconnecte...
         */
        socket.on('disconnect', function(socket) {
            // Mich aus dem Online-Array löschen
            online.splice(me_obj);
            // Alle Informieren, dass ich weg bin
            app.io.broadcast('user-offline', me_obj);
            app.io.broadcast('system message', me.username + " hat uns verlassen.");
            console.log(me_obj.username + " hat den Chat verlassen.");
        });

        console.log(socket.handshake.user.username + " hat den Chat betreten.");

    });

    /**
     * Event "chat message" erhält eine Nachricht und broadcastet diese.
     */
    app.io.route('chat message', function(req) {
        // Messag-Objekt erstellen (ua. für History)
        var msg = messageHandler.newMessage("message", req.handshake.user, req.data);
        // User in msg überschreiben (Datenschutz)
        msg.user = {username: msg.user.username, id: msg.user._id};
        // Alle anderen Benutzer über die neue Nachricht informieren
        app.io.broadcast('chat message', msg);
        console.log("Nachricht - \"" + req.handshake.user.username + ": " + req.data + "\"");
    });

    /**
     * Event "typing" broadcastet "typing"
     */
    app.io.route('typing', function(req) {
        req.io.broadcast('isTyping', req.handshake.user.username);
    });

    /**
     * Event "private message" sucht ein bestimmten Empfänger und schickt ihm die private Nachricht
     */
    app.io.route('private message', function(req) {
        msg = messageHandler.newMessage("private message", req.handshake.user, req.data.data);
        msg.user = {username: msg.user.username, id: msg.user._id};
        if(socketlist.length>0) {
            // Gehe alle Sockets durch
            for(i = 0; i<=socketlist.length-1; i++) {
                // Ist der aktuelle Socket der Empfänger?
                if(socketlist[i].id == req.data.recipient) {
                    // Sende Nachricht an den bestimmten Socket
                    socketlist[i].sock.emit("private message", msg);
                }
            }
        }
    });

    /**
     * Event "image incoming" informiert alle Clients, dass gleich ein Bild kommt (Client: Loader vorbereiten)
     */
    app.io.route('image incoming', function(req) {
        app.io.broadcast('image incoming', {user: {username: req.handshake.user.username, id: req.handshake.user._id}, identifyer: req.data, time: new Date()});
    });

    /**
     * Event "image" empfängt und sendet ein Bild an alle
     */
    app.io.route('image', function(req) {
        msg = messageHandler.newMessage("image", req.handshake.user, req.data.image, req.data.identifyer);
        msg.user = {username: msg.user.username, id: msg.user._id};
        app.io.broadcast('image', msg);
    });

    /**
     * Event "webcam" Empfängt ein Webcam Bild und sendet es an alle.
     */
    app.io.route('webcam', function(req) {
        emitWebcam(app, {pic: req.data, user: {username: req.handshake.user.username, id: req.handshake.user._id}});
    });

};

/**
 * Erfolgreiche Authentifizierung mittels passport
 * @param data
 * @param accept
 */
function onAuthorizeSuccess(data, accept){
    console.log(data.user.username + " hat sich ueber Socket.IO authentifiziert.");

    // The accept-callback still allows us to decide whether to
    // accept the connection or not.
    accept(null, true);

}

/**
 * Fehlgeschlagene Authentifizierung
 * @param data
 * @param message
 * @param error
 * @param accept
 */
function onAuthorizeFail(data, message, error, accept){
    if(error)
        throw new Error(message);
    console.log('failed connection to socket.io:', message);

    // We use this callback to log all of our failed connections.
    accept(null, false);

}

/**
 * Sendet alle Bilder der History an den Clienten.
 * @param socket
 */
function emitHistory(socket) {
    messageHandler.getMessageHistoryForClient(200, function(history_array, history_images) {

        // History senden
        socket.emit('message history', history_array);

        // Gibt es Bilder in der History, die Schrittweise nachsenden
        if(history_images.length > 0) {
            for(i = 0; i<=history_images.length-1; i++) {
                if(history_images[i]) {
                    emitHistoryImage(socket, history_images[i]);
                }
            }
        }

    });
}

/**
 * Sendet ein Bild welches aus der History geladen wird an den Client.
 * @param socket
 * @param image
 */
function emitHistoryImage(socket, image) {
    process.nextTick(function() {
        socket.emit('image', image);
    });
}

/**
 * Sendet das Webcam Bild eines Users an alle Teilnehmer
 * @param app
 * @param data
 */
function emitWebcam(app, data) {
    process.nextTick(function() {
        app.io.broadcast('webcam', data);
    });
}
