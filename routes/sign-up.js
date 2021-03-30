var express = require('express');
const passport = require('passport');
var router = express.Router();

router.post('/', (req, res) => {
    console.log(req.body)
    res.send('Holla')

    const { username, password } = req.body;

    // User.register({ username: username, password: password }, (err, userFound) => {
    //     err ? res.send({
    //         message: err
    //     }) :
    //         passport.authenticate('local')(req, res, ()=>{
    //             res.send({
    //                 message: 'Signed up successfully!'
    //             })
    //         })
    // })
})

module.exports = router;