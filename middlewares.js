const mongoose = require('mongoose')
const Bank = require("./models/Bank")
const Session = require("./models/Session")
const Transaction = require("./models/Transaction")
const fetch = require("node-fetch")



exports.verifyToken = async (req, res, next) => {

    // Check Authorization header existance
    let authorizationHeader = req.header('Authorization')
    if (!authorizationHeader) {
        return res.status(401).send({error: 'Missing Authorization header'})
    }

    // Split Authorization header by space
    authorizationHeader = authorizationHeader.split(' ')

    // Check that Authorization header includes a space
    if (!authorizationHeader[1]) {
        return res.status(400).send({error: 'Invalid Authorization header format'})
    }

    // Validate that the provided token conforms to MongoDB id format
    if (!mongoose.Types.ObjectId.isValid(authorizationHeader[1])) {
        return res.status(401).send({error: 'Invalid token'})
    }

    // Find a session with given token
    const session = await Session.findOne({_id: authorizationHeader[1]})

    // Check that the session existed
    if (!session) return res.status(401).send({error: 'Invalid token'})

    // Store the user's id in the req objects
    req.userId = session.userId
    req.sessionId = session.id

    return next(); // Pass the execution to the next middleware function

}

exports.refreshListOfBanksFromCentralBank = async function refreshListOfBanksFromCentralBank(){
    console.log('refreshing list of banks')

    try {

        //Attempt to get a list of banks in JSON format form central bank
        let banks = await fetch(process.env.CENTRAL_BANK_URL, {
            headers: {'Api-Key': process.env.CENTRAL_BANK_APIKEY}
        }).then(responseText => responseText.json())

        // delete all data from banks collection
        await Bank.deleteMany()

        // Initialize bulk operation object
        const bulk = Bank.collection.initializeUnorderedBulkOp()

        banks.forEach(bank => {
            bulk.insert(bank)
        })

        // Bulk inser (in parallel) all prepared data to DB
        await bulk.execute()

        console.log('Done')
        return true

    } catch (e) {

        //Handle error
        console.log('Error:'+e.message)
        return { error: e.message}
    }

}

//   !!!!!!!!!!!!!!!!!!!!!!!!!
// Siin  all pool ka hästi kontrollida, midagi ei jõudnud kirjutada!!


exports.processTransactions = async function (){
    console.log('Running processTransactions')

    // get pending transactions
    const pendingTransactions = await Transaction.find({status: Pending})


    // Loop threouhg all pending

    pendingTransactions.forEach(transaction => {

        // check of the trasaction has expired
        const nowPlus3Day = new Date (
            transaction.createdAt.getFullYear(),
            transaction.createdAt.getMonth(),
            transaction.createdAt.getDay() +3
        )

        if(nowPlus3Day > new Date){

        }
    })
    // Check if th etranaction has expired


    //Recursively call itself again
    setTimeout(exports.processTransactions, 1000)
}