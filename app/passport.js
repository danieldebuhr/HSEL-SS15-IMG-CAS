/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */
var LocalStrategy   = require('passport-local').Strategy;

var User            = require('../app/models/user.js');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
       done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        })
    });

    passport.use('local-signup', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    },function(req, username, password, done) {

        process.nextTick(function() {

            User.findOne({ 'username' : username }, function(err, user) {

                if(err)
                    return done(err);

                if(user) {
                    return done(null, false, req.flash('signupMessage', 'Dieser Benutzername wird bereits genutzt.'));
                } else {

                    var newUser = new User();

                    newUser.username = username;
                    newUser.password = newUser.generateHash(password);

                    newUser.save(function(err) {
                        if(err)
                            throw err;
                        return done(null, newUser);
                    });

                }

            });

        });

    }));

    // Login-Strategie
    passport.use('local-login', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true
    // Authentifiziert User
    }, function(req, username, password, done) {
        // Benutzer suchen und aus Datenbank auslesen
        User.findOne({'username' : username}, function(err, user) {
            if(err)
                return done(err);
            if(!user)
                return done(null, false, req.flash('loginMessage', 'Benutzer oder Kennwort falsch.'));
            if(!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', "Benutzer oder Kennwort falsch."));

            return done(null, user);
        });

    }));



};