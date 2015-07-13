/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */

// MongoDB Laden
var mongo = require('mongodb').MongoClient;
var conf  = require('./../config/config.js');

/**
 * Dieses Modul k�mmert sich um die im Chat verwendeten Nachrichten und speichert diese f�r
 * die History.
 * @type {{newMessage: Function, getMessageHistory: Function, getMessageHistoryForClient: Function, readHistoryFromDB: Function}}
 */
module.exports = {

    /**
     * newMessage erstellt und speichert eine neue Chat-Nachricht.
     * @param type String "message", "private message" oder "image"
     * @param user Object Das User-Object, welches die Nachricht verfasst hat
     * @param data String Inhalt der Nachricht / des Bildes (Base64 Codiert)
     * @param identifyer String optional Interner Bezeichner f�r ein Bild
     * @returns Message Object
     */
    newMessage: function (type, user, data, identifyer) {

        // User-Objekt anlegen und mit den
        // �bergabeparametern der Funktion f�llen
        var message = {};
        message.type = type;
        message.data = data;
        message.identifyer = identifyer;
        message.user = user;
        message.time = new Date();

        // Standardm��ig wird die Message geloggt
        // Verbindung zur DB herstellen, Collection laden und
        // das Message-Objekt ablegen
        mongo.connect(conf.mongo.url, function(err, database) {
            var collection = database.collection('messages');
            collection.insert(message);
        });

        // Message zur weiteren Verarbeitung zur�ckgeben
        return message;

    },

    /**
     * getMessageHistoryForClient verarbeitet eine bestimmte Anzahl von Nachrichten
     * und gibt sie dem callback in zwei Arrays zur�ck.
     * @param anzahl int Anzahl der zu lesenden Nachrichten (Standard 200)
     * @param callback function Die R�ckgabe-Funktion erh�lt zwei Parameter: ein Array mit den Nachrichten & Bilder-
     * Containern, sowie ein Array mit den Bilder-Daten (Base64 Decodiert) und Identifyer.
     */
    getMessageHistoryForClient: function (anzahl, callback) {
        if (typeof(anzahl) == "undefined") anzahl = 10;

        this.readHistoryFromDB(anzahl, function(his) {

            var messages = [];
            var imagedata = [];

            // damit die Nachrichten in richtiger Reihenfolge ankommen, werden sie hier von Hinten gelesen
            for (i = his.length - 1; i >= 0; i--) {
                // Sind Bilder dabei, werden die Base64-Bilddaten extrahiert und gesondert abgelegt
                if (his[i].type == "image") {
                    imagedata.push({identifyer: his[i].identifyer, data: his[i].data});
                    his[i].data = "";
                }
                messages.push(his[i]);
            }

            // Beide Arrays werden dem Callback �bergeben.
            callback(messages, imagedata);

        });

    },

    /**
     * getMessageHistory verarbeitet eine bestimmte Anzahl von Nachrichten
     * und gibt sie dem callback als Array zur�ck.
     * @param anzahl int Anzahl der zu lesenden Nachrichten (Standard 200)
     * @param callback function Die R�ckgabe-Funktion erh�lt einen Array mit den Nachrichten & Bilder-
     * Daten
     */
    getMessageHistory: function (anzahl, callback) {
        // Daten aus DB lesen
        this.readHistoryFromDB(200, function(his) {
            var messages = [];
            // Daten in anderer Reihenfolge in Array schreiben
            for(i = his.length-1; i>=0; i--) {
                messages.push(his[i]);
            }
            // Array dem Callback �bergeben.
            callback(messages);
        });
    },

    /**
     * Liest Nachrichten-Eintr�ge aus der DB und gibt sie dem Callback zur�ck.
     * @param anzahl int Anzahl der Nachrichten
     * @param callback R�ckgabe-Funktion
     */
    readHistoryFromDB: function(anzahl, callback) {
        if (typeof(anzahl) == "undefined") anzahl = 200;
        // Verbindung zur DB herstellen
        mongo.connect(conf.mongo.url, function(err, database) {
            var messages = [];
            // Collection "messages" laden
            var collection = database.collection('messages');
            // mit find, where, limit und sort werden die Eintr�ge aus der Datenbank gelesen und aufbereitet
            collection.find({$where: "this.type != 'private message' "}).limit(anzahl).sort({'time': -1}).toArray(function (err, his) {
                callback(his);

            });
        });
    }

};