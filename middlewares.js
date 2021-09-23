const mongoose = require('mongoose')
const Session = require("./models/Session")
exports.verifyToken = async (req, res, next) => {

    //Check authorization header existance
    let authorizationHeader = req.header('Authorization')
    if (!authorizationHeader) {
        return res.status(401).send({error: 'Missing Authorization header'})
    }

    //Split Authorization header by space
    authorizationHeader = authorizationHeader.split(' ')

    //Check that the Authorization header includes a space
    if(!authorizationHeader[1]){
        return res.status(400).send({error: 'Invalid Authorization header format'})
    }

    // Validate that the provided toke confors to Mongodb id format
    if (!mongoose.Types.ObjectId.isValid(authorizationHeader[1])){
        return res.status(401).send({error: 'Invalid token'})
    }


    // Find a session given token
    const session = await Session.findOne({_id: authorizationHeader[1]})

    //Check that the session existed
    if(!session) return res.status(401).send({error: 'Invalid token'})

    //Store the user's id in the req objects
    req.userId = session.userId
    req.sessionId = session.id

    return next(); //Pass request to the next middleware function

}