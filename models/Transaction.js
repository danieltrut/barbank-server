const mongoose = require('mongoose')

module.exports = mongoose.model('Transaction', mongoose.Schema({
    accountFrom:{type: String, required: true, mingleght: 4},
    accountTo:{type: String, required: true, mingleght: 4},
    amount:{type: String, required: true, min: 0.01},
    currency:{type: String, required: true, minlength: 3},
    explanation:{type: String, required: true, mingleght: 1},
    senderName:{type: String, required: true},
    status:{type: String, required: true, default: 'Pending'}

}, {
    toJSON: {
        transform: (docIn, docOut) => {
            docOut.id = docOut._id
            delete docOut._id
            delete docOut.__v
        }
    }
}))
