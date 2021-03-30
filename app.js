const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const usersRouter = require('./routes/users');
const login = require('./routes/login');
const signUp = require('./routes/sign-up')
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const bodyParser = require('body-parser');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  // methods: 'GET, HEAD, PUT, PATCH, POST, DELETE'
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('My Big little secret'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.use('/users', usersRouter);
app.use('/login', login);
app.use('/signup', signUp);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(session({
  secret: 'My Big little secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: process.env.GOOGLE_CALLBACK_URL,
//   userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
// },
//   function (accessToken, refreshToken, profile, cb) {
//     console.log(profile);
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

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

app.get('/home', function (req, res, next) {
  res.send('respond with a resource');
});

// app.post('/signup', (req, res) => {
//   // const userName = req.body.username;
//   // const password = req.body.password;

//   console.log(req.body)

//   // User.register({ username: userName, password: password }, (err, userFound) => {
//   //   err ? res.send({
//   //     message: err
//   //   }) :
//   //     passport.authenticate('local')(req, res, () => {
//   //       res.send({
//   //         message: 'Signed up successfully!'
//   //       })
//   //     })
//   // })
// })

// app.get('/users', function(req, res, next) {
//   res.send('respond with a resource');
// });


app.listen(9000, () => console.log('API running on port 9000...'))

// module.exports = app;