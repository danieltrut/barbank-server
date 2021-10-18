const mongoose = require('mongoose')
const Bank = require("./models/Bank")
const Session = require("./models/Session")
const Transaction = require("./models/Transaction")
const fetch = require("node-fetch")
const jose = require('node-jose')
const fs = require('fs')
const crypto = require('crypto')

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


function isExpired(transaction) {
    // check of the trasaction has expired
    const nowPlus3Day = new Date (
        transaction.createdAt.getFullYear(),
        transaction.createdAt.getMonth(),
        transaction.createdAt.getDay() +3
    )

    if (nowPlus3Day > new Date) {

        // Set transaction status as failed
        transaction.status = 'Failed'

        // Set statusDetail as expired
        transaction.statusDetail = 'Expired'

        // Save changes
        transaction.save()
        // Take the next transaction
        return true
    }
    return false
}

function setStatus(transaction, status, statusDetail) {
    // Set transaction status to in progress
    transaction.status = status
    transaction.statusDetail = statusDetail
    transaction.save()
}

async function createJwtString(input) {
    // Create JWS
    let privateKey
    try {
        privateKey = fs.readFileSync('private.key', 'utf8')
        console.log('privateKey: ' + privateKey)
        const keystore = jose.JWK.createKeyStore();
        const key = await keystore.add(privateKey, 'pem')
        return await jose.JWS.createSign({format: 'compact'}, key).update(JSON.stringify(input), "utf8").final()
    } catch (err) {
        console.error('Error reading private key' + err)
        throw Error('Error reading private key' + err)
    }

}

async function sendRequestToDestinationBank(jwt) {
    const response = await fetch('http://localhost:4000/b2b', {
        method: 'post',
        body: JSON.stringify({jwt}),
        headers: {'Content-Type': 'application/json'}
    });

    const data = await response.json();
    console.log(data)
    return data
}

exports.processTransactions = async function (){
    console.log('Running processTransactions')

    // get pending transactions
    const pendingTransactions = await Transaction.find({status: 'Pending'})

    let accountToBank, jwt;

    // Loop throught all pending

    pendingTransactions.forEach(async transaction => {

        // Assert that the transaction has not expired
        if (isExpired(transaction)) return;

        // Set transaction status to in progress
        setStatus(transaction, 'In progress');

        // Get the bank from accountTo
        let bankPrefix = transaction.accountTo.substring(0, 3)
        accountToBank = Bank.findOne({bankPrefix})

        // If we have don't the bank in local database
        if (!accountToBank) {
            let result = exports.refreshListOfBanksFromCentralBank()
            if (typeof result.error !== 'undefined') {
                setStatus(transaction, 'Pending', 'Central bank refresh failed: ' + result.error)

                // Move to the new transaction
                return
            }
            accountToBank = Bank.findOne({bankPrefix})
            if (!accountToBank) {
                return setStatus(transaction, 'Failed', 'Bank' + bankPrefix + ' does not exist')

            }
        }

        try {
            jwt = await createJwtString({
                accountFrom: transaction.accountFrom,
                accountTo: transaction.accountTo,
                amount: transaction.amount,
                currency: transaction.currency,
                explanation: transaction.explanation,
                senderName: transaction.senderName,
            });

             const response = await sendRequestToDestinationBank(jwt);

             transaction.receiverName = response.receiverName
            return setStatus(transaction, 'Completed', '')

        }    catch (e) {
            console.log(e.message)

        }

    }, Error)


    //Recursively call itself again
    setTimeout(exports.processTransactions, 1000)
}