const express = require('express');
const app = express()
const mongoose = require('mongoose');
const Transaction = require("./models/Transaction");

//tret
require('dotenv').config()

(async function () {
    const pendingTransactions = await Transaction.find({status: 'Pending'})
    console.log(pendingTransactions)
    pendingTransactions.forEach(function (bank){
        console.log(bank)
    })

})()

mongoose.connect(process.env.MONGODB_URI, {}, function (err) {
    if(err)throw err
    console.log('Connected to mongoDB')
})



app.listen(process.env.PORT, function () {
    console.log(`Listening on port ${process.env.PORT}`)
})