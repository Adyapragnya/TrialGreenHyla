const mongoose = require('mongoose');

const HylaGeofenceTypesSchema = new mongoose.Schema({
    geofenceType :Array

}, { timestamps: true });

const HylaGeofenceTypes = mongoose.model('hylageofencetypes', HylaGeofenceTypesSchema, 'hylageofencetypes');


// Export the model
module.exports =  HylaGeofenceTypes ;

