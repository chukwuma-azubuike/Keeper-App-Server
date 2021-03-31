require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const bodyParser = require('body-parser');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(cors({
  origin: 'http://localhost:3000',
  // methods: 'GET, HEAD, PUT, PATCH, POST, DELETE'
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.use(session({
  secret: 'My Big little secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// passport.use(new FacebookStrategy({
//   clientID: process.env.FACEBOOK_APP_ID,
//   clientSecret: process.env.FACEBOOK_APP_SECRET,
//   callbackURL: process.env.FACEBOOK_CALLBACK_URL,
//   profileFields: ['id', 'displayName', 'photos', 'email']
// },
//   function (accessToken, refreshToken, profile, cb) {
//     console.log(accessToken);
//     console.log(profile);
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

mongoose.connect('mongodb://localhost:27017/keeperAppDB', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  userName: String,
  password: String,
  googleId: String,
  notes: []
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

const notesSchema = {
  title: String,
  content: String
}

const Note = mongoose.model('Note', notesSchema);

//Get home route
app.get('/home', function (req, res, next) {
  req.isAuthenticated() ? User.findById(req.userid, (err, userFound) => {
    console.log(err)
    res.send({
      status: 'OK',
      message: 'Successfully logged in',
      notes: userFound.notes
    })
  }) : res.send({ status: 'FAILED', message: 'You are currently not logged in' })
});

// Post to home route
app.post('/home', (req, res) => {
  const { title, content } = req.body;
  req.isAuthenticated() ?
    User.findByIdAndUpdate(req.userid, { notes: { title, content } }, (err, notesUpdated) => {
      err ? console.log(err) :
        res.send({ status: 'OK', message: 'Notes successfully updated!' })
    }) :
    res.send({
      status: 'FAILED',
      message: 'You are currently not logged in'
    })
})



app.post('/signup', (req, res, next) => {

  const { username, password } = req.body;
  User.register({ username: username }, password, (err, userCreated) => {
    err ? res.send({
      status: 'FAILED',
      message: 'User already exists'
    }) :
      res.send({
        status: 'OK',
        message: 'Successfully registered!'
      })
    passport.authenticate('local')(req, res, () => {
      res.send({
        message: `Hello ${username}, you are successfully logged in`
      })
      res.redirect('/home')
    })
  })
})

app.post('/login', (req, res) => {

  const { username, password } = req.body;

  const userSession = new User({
    username: username,
    password: password
  });

  req.login(userSession, (err) => {
    err ? res.send({ message: err }) :
      passport.authenticate('local')(req, res, (err) => {
        err ? console.log(err) : res.send({
          status: 'OK',
          message: 'Successfully logged in'
        })
      })
  })
})

app.listen(9000, () => console.log('API running on port 9000...'))