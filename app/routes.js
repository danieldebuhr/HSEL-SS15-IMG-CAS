/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */
module.exports = function(app, passport) {

    /**
     * Hauptseite
     */
    app.get('/', function(req, res) {
        if(req.isAuthenticated()) {
            // Namen für Anmeldung setzen
            res.locals.username = req.user.username;
        } else {
            // Keinen Namen für Anmeldung setzen
            res.locals.username = "";
        }
        res.render('index.ejs');
    });

    /**
     * Anmeldeseite
     */
    app.get('/anmelden', function(req, res) {
        res.render('anmelden.ejs', {message: req.flash('loginMessage')});
    });

    /**
     * Verabeitung des Absendens des Formulars
     * Authentifizierung über passport
     */
    app.post('/anmelden', passport.authenticate('local-login', {
        successRedirect: '/chat',
        failureRedirect: '/anmelden',
        failureFlash: true

    }));

    /**
     * Seite für Registrierung
     */
    app.get('/registrieren', function(req, res) {
        res.render('registrieren.ejs', {message: req.flash('signupMessage')});
    });


    /**
     * Verabeitung des Registrieren-Formulars
     * Authentifizierung über passport
     */
    app.post('/registrieren', passport.authenticate('local-signup', {
        successRedirect: '/chat',
        failureRedirect: '/registrieren',
        failureFlash: true
    }));

    /**
     * Allgemeinen Chat anzeigen, wenn eingeloggts
     */
    app.get('/chat', isLoggedIn, function(req, res) {
        res.render('chat.ejs');
    });

    /**
     * History anzeigen
     */
    app.get('/history', isLoggedIn, getMessageHistory, function(req, res) {
        res.render('history.ejs', {
            message_history: req.message_history
        });
    });

    /**
     * Logout und Redirect auf Hauptseite
     */
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    /**
     * Middleware: Liest History-Daten aus MessageHandler
     * @param req Express Request Objekt
     * @param res Express Response Objekt
     * @param next nächste Middlewarefunktion
     */
    function getMessageHistory(req, res, next) {

        var messageHandler = require('./messagehandler.js');
        messageHandler.getMessageHistory(200, function(history) {
            req.message_history = history;
            return next();
        });
    }

    /**
     * Middleware: Prüfung ob Login erfolgreich
     * @param req Express Request Objekt
     * @param res Express Response Objekt
     * @param next nächste Middlewarefunktion
     * @returns {*}
     */
    function isLoggedIn(req, res, next) {
        if(req.isAuthenticated()) {
            return next();
        }
        res.redirect('/');
    }

};


