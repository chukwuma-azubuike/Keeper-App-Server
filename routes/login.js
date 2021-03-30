var express = require('express');
const passport = require('passport');
var router = express.Router();

router.post('/', (req, res) => {

    const { username, password } = req.body;

    console.log(req.body);
    res.send('Holla')

    // Users.find({ username: username }, (err, userFound) => {
    //     err ? res.send({
    //         message: `User doesn't exist`
    //     }) :
    //         userFound.password === !password ? res.send({
    //             message: 'Incorrect password',
    //         }) :
    //             res.send({
    //                 messaage: 'Successfully logged in',
    //                 data: userFound.notes
    //             })
    // })
})

module.exports = router;