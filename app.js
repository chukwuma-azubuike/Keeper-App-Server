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
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const jwtDecode = require('jwt-decode');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

// app.use(cors({
//   origin: 'https://keeper-app-02.herokuapp.com',
//   // origin: 'http://localhost:3000',
//   // methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
//   credentials: true
// }));

app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.use(session({
  secret: 'My Big little secret',
  resave: true,
  saveUninitialized: true
}));
app.use(cookieParser('My Big little secret'));

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

//Connect to remote MongDB cluster
mongoose.connect(process.env.MONGODB_LINK,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => { err ? console.log(err) : console.log('MongoDB is live...') });
// mongoose.connect('mongodb://localhost:27017/keeperAppDB', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

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

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  // console.log(req.headers['authorization'])
  if (typeof bearerHeader !== 'undefined') {
    let bearerToken = bearerHeader.split(' ')[1];
    req.token = bearerToken;
    next()
  } else {
    res.sendStatus(403); //Forbidden
  }
}

//Get home route
app.get('/home', verifyToken, function (req, res) {

  var decoded = jwtDecode(req.token);
  // console.log('decoded.id')

  jwt.verify(req.token, process.env.SECRET, (err, authData) => {
    err ? res.sendStatus(403) :
      User.findOne({ _id: authData.id }, (err, userFound) => {
        err ? sendStatus(403) :
          res.json({
            status: 'OK',
            message: 'Authenticated',
            notes: userFound.notes && userFound.notes
          })
      })
  })
});

// Post to home route
app.post('/home', verifyToken, (req, res) => {

  console.log(req.body);

  jwt.verify(req.token, process.env.SECRET, (err, authData) => {
    err ? res.send(err) :
      console.log(authData);
    User.findOneAndUpdate({ username: authData.user },
      { $push: { notes: req.body } },
      (err, notesUpdated) => {
        err ? console.log(err) :
          // console.log(`Notes--> ${notesUpdated}`)
          res.json({
            status: 'OK',
            message: 'Notes successfully updated!',
            data: authData
          })
      })
  })
})

app.post('/home/delete', verifyToken, (req, res) => {
  const id = req.body.id;
  const arrayIndex = `notes.${id}`;
  const notes = `notes`;
  var decoded = jwtDecode(req.token);
  console.log(decoded.id)
  // console.log(arrayIndex)
  jwt.verify(req.token, process.env.SECRET, (err, authData) => {
    err ? console.log(err) :
      User.findOneAndUpdate({ _id: authData.id }, { $pull: { notes } }, { new: true },
        (err, setNotesForDelete) => {
          err ? console.log(err) :
            setNotesForDelete.save((err) => {
              err ? console.log(err) : console.log(setNotesForDelete)
            })
          // User.findOneAndUpdate({ username: authData.user }, { $pull: arrayIndex }, { new: true },
          //   (err, remainingNotes) => {
          //     err ? console.log(err) :
          //       res.json({
          //         status: 'OK',
          //         data: remainingNotes
          //       })
          //   }
          // )
        })
  })
  res.json({ status: 'OK' })
})

app.post('/signup', (req, res) => {

  const { username, password } = req.body;

  User.register({ username: username }, password, (err, userCreated) => {
    if (err) {
      res.json({
        data: req.body,
        error: err,
        status: 'FAILED',
        message: 'User already exists'
      })
    } else {
      console.log('registered')
      const userSession = new User({
        username: username,
        password: password
      });
      req.login(userSession, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log('logged in')
          User.findOne({ username: username }, (err, userFound) => {
            jwt.sign({ user: username, id: userFound._id }, process.env.SECRET, (err, token) => {
              err ? console.log(err) :
                console.log('token created')
              res.json({
                token: token,
                status: 'OK',
                message: 'Successfully registered!'
              })
            })
          })
        }
      })
    }
  })

})

app.post('/login', (req, res) => {

  const { username, password } = req.body;

  const userSession = new User({
    username: username,
    password: password
  });

  req.login(userSession, function (err) {
    if (err) {
      console.log(err);
      res.json({
        status: 'FAILED',
        message: 'User does not exist!'
      })
    } else {
      passport.authenticate('local', (err, user, info) => {
        err ? console.log(err) :
          !user ? res.json({
            status: 'FAILED',
            message: 'Wrong credentials'
          }) :
            jwt.sign({ user: username, id: user._id }, process.env.SECRET, (err, token) => {
              err ? console.log(err) :
                res.json({
                  token: token,
                  status: 'OK',
                  message: 'Successfully logged in'
                })
            });
      })
        (req, res, function (err) {
          !err ? console.log('Success') : console.log(err);
        })
    }
  })
})

app.listen(9000, () => console.log('API running on port 9000...'))