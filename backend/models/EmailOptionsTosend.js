const mongoose = require('mongoose');

const emailOptionsTosendSchema = new mongoose.Schema({
    user: String,
    pass: String,
    aisuserkey: String,

 
}, { timestamps: true });

const EmailOptionsTosend = mongoose.model('emailOptionsTosend', emailOptionsTosendSchema, 'emailOptionsTosend');


// Export the model
module.exports =  EmailOptionsTosend ;

