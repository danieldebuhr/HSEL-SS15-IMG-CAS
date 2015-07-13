/**
 * Chat-Application-Service (CAS)
 * @author Daniel de Buhr, Marc Enders
 * @Version 08.07.2015
 */

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');


// Schema definieren f�r Mongoose-Schema f�r User
var userSchema = mongoose.Schema({
    username: String,
    password: String
});

// Generiert aus Passwort Hashwert
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};
// Validiert Passworteingabe und pr�ft ob Daten �bereinstimmen
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);