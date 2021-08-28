//. app.js

var express = require( 'express' ),
    ejs = require( 'ejs' ),
    passport = require( 'passport' ),
    session = require( 'express-session' ),
    WebAppStrategy = require( 'ibmcloud-appid' ).WebAppStrategy,
    app = express();

var settings = require( './settings' );

//. setup session
app.use( session({
  secret: 'appid_changepassword',
  resave: false,
  cookie: { maxAge: ( 1 * 60 * 60 * 1000 ) },
  saveUninitialized: false
}));

//. setup passport
app.use( passport.initialize() );
app.use( passport.session() );
passport.serializeUser( ( user, cb ) => cb( null, user ) );
passport.deserializeUser( ( user, cb ) => cb( null, user ) );
passport.use( new WebAppStrategy({
  tenantId: settings.tenantId,
  clientId: settings.clientId,
  secret: settings.secret,
  oauthServerUrl: settings.oauthServerUrl,
  redirectUri: settings.redirectUri
}));

//. enable routing
app.use( express.Router() );

//. template engine
app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

//. login
app.get( '/appid/login', passport.authenticate( WebAppStrategy.STRATEGY_NAME, {
  successRedirect: '/',
  forceLogin: false //true
}));

//. callback
app.get( '/appid/callback', function( req, res, next ){
  next();
}, passport.authenticate( WebAppStrategy.STRATEGY_NAME )
);

//. logout
app.get( '/appid/logout', function( req, res ){
  WebAppStrategy.logout( req );
  res.redirect( '/' );
});

//. access restriction
app.all( '/*', function( req, res, next ){
  if( !req.user || !req.user.sub ){
    res.redirect( '/appid/login' );
  }else{
    next();
  }
});


//. top page
app.get( '/', function( req, res ){
  res.render( 'index', { user: req.user } );
});


//. listening to port
var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

