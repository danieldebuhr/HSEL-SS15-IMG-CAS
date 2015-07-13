/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */


//Einbindung verschiedener Module
var conf                = require('./config/config.js');                    // Konfiguration Server
var express             = require('express.io');                            // Datenübertragung Socket.io
var app                 = express();                                        // Webserver
var mongoose            = require('mongoose');                              // Speichert Benutzerdaten in DB nach Schema
var passport            = require('passport');                              // Framework zur Benutzerauthentifizierung
var flash               = require('connect-flash')();                       // Nachrichten in Express speichern
var cookieParser        = require('cookie-parser');                         // Ließt Cookies aus
var bodyParser          = require('body-parser');                           // Ließt Formulardaten aus
var session             = require('express-session');                       // Kümmert sich um die Sessions
var connectMongoStore   = require('connect-mongostore')(session);           // Verbindung zur Datenbank für Sessions

                          require('ismobile')(app);                         // Prüft ob mobile Device oder nicht

// Initialisiert HTTP und IO-Server
app.http().io();


// Session-Handling vorbereiten (Store erstellen)
var sessionStore = new connectMongoStore(conf.mongostore);
// Nutzung von Sessions für Express
app.use(session( {
    secret: 'diesisteinegeileappyo',
    store: sessionStore,
    resave: true,
    saveUninitialized: true
} ));

// Initialisiert Cookie-Parser
app.use(cookieParser());


// Allgemeines
// Initialisierung Body-Parser
app.use(bodyParser.urlencoded({ extended: true }));
// Ausgabe statische Dateien
app.use('/static', express.static(__dirname + '/static'));
// Zum Rendern EJS verwenden
app.set('view enginge', 'ejs');


// Benutzer-Authentifizierung
// Verbindung für Datenbank
mongoose.connect(conf.mongo.url);
require('./app/passport.js')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash);


// Controls
// Website Routen laden
require('./app/routes.js')(app, passport);
// Socket.io Routen laden
require('./app/socketio.js')(app, sessionStore);

// Server starten
app.listen(conf.allgemein.port);
// Ausgabe Serverinfo in Konsole
console.log("CAS gestartet. Port " + conf.allgemein.port);
