
/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  api = require('./routes/api'),
  users = require('./routes/users'),
  auth = require('./mylib/basicAuth'),
  db = require('./models/mongooseModel'),
  config = require('./confs.js'),
  fs = require('fs'),
  S = require('string'),
  crypto = require('crypto'),
  nodemailer = require("nodemailer")
  ;
  
  
var app = express();

// Configuration

	

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  //app.set('view options', {layout: true});
  app.use(express.bodyParser({keepExtensions: true,uploadDir:__dirname + '/public/uploads/originals'}));
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser('SAfuBUZ2'));
  // Session management
  app.use(express.session({
    "secret": "bb352fece6f80a5cff2d6088a376eddf",
    "store":  new express.session.MemoryStore({ reapInterval: 60000 * 10 })
  }));
  app.use(function(req, res, next){
    res.locals.session = req.session.user;
	//res.locals.user = JSON.stringify(req.session.user);	
	res.locals.redir = req.query.redir;
	res.locals.message = req.session.message;
	res.locals.type = req.session.type;
	//res.locals.conf = JSON.stringify(config.confs.dev);
    next();
  });
  
  app.use(express.methodOverride());
  app.use(app.router);
  
});

app.configure('development', function(){
	conf = config.confs.dev;
	app.locals.conf = JSON.stringify(config.confs.dev);
	
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});


app.configure('production', function(){
	conf = config.confs.prod;
	app.locals.conf = JSON.stringify(config.confs.prod);
	app.use(express.errorHandler());
});

var db = routes.db(conf);	


	
// Routes


// OPEN ACCES ROUTES :
app.get('/user/login', routes.user_login);
app.get('/user/logout', routes.user_logout);
app.get('/user/new', routes.user_new);
app.get('/user/validate/:token/:password', routes.user_validate);
app.get('/pictures/:size/:picture', routes.picture);
app.get('/static/images/:name', routes.static_image);

app.post('/user',routes.user);
//app.post('/validate',routes.validate);
app.post('/session',routes.session);

// SECURED BY LOGIN ROUTES:

//map
app.get('/', routes.requiresLogin, routes.index);
app.get('/news/map', routes.requiresLogin, routes.news_map);
app.get('/news/map/search/:str', routes.requiresLogin, routes.news_map_search);
app.get('/news/feed', routes.requiresLogin, routes.news_feed);
app.get('/feed/feed', routes.requiresLogin, routes.feed_feed);
app.get('/feed/afeeds', routes.requiresLogin, routes.feed_afeeds);
app.post('/news',routes.requiresLogin, routes.news);

// settings
app.get('/settings', routes.requiresLogin, routes.settings_profil);

app.get('/settings/profile', routes.requiresLogin, routes.settings_profile);
app.post('/profile',routes.requiresLogin, routes.profile);

app.get('/settings/privateprofile', routes.requiresLogin, routes.settings_privateprofile);
app.post('/privateprofile',routes.requiresLogin, routes.privateprofile);

app.get('/settings/alerts', routes.requiresLogin, routes.settings_alerts);
app.post('/alerts',routes.requiresLogin,routes.alerts);

app.get('/settings/password', routes.requiresLogin, routes.settings_password);
app.post('/password',routes.requiresLogin, routes.password);

app.get('/settings/firstvisit', routes.requiresLogin, routes.settings_firstvisit);
app.post('/firstvisit',routes.requiresLogin, routes.firstvisit);

app.post('/favplace', routes.requiresLogin, routes.addfavplace); 
app.post('/delfavplace', routes.requiresLogin, routes.delfavplace); 



// OPEN ACCESS API
app.get('/api/infos', api.infos);
app.get('/api/feeds', api.feeds);
app.get('/api/afeeds', api.afeeds);
app.get('/api/geoinfos/:x1/:y1/:x2/:y2/:heat/:type/:str', api.geoinfos);
app.get('/api/zones/:x/:y', api.zones);
app.get('/api/cats', api.cats);
app.get('/api/catsandtags', api.catsandtags);
app.get('/api/places', api.places);
app.get('/api/searchplaces/:str', api.searchplaces);
app.get('/api/usersearch/:string', api.usersearch);

app.get('/api/oauth/login', api.oauth_login);
app.get('/api/oauth/authorize', api.oauth_authorize); 
app.get('/api/oauth/authorize/:client_id/:redirect_uri', api.oauth_authorize); 
app.get('/api/oauth/authorize/:client_id/:redirect_uri/:response_type', api.oauth_authorize); 
app.get('/api/oauth/authorize/:client_id/:redirect_uri/:response_type/:scope', api.oauth_authorize); 
app.get('/api/oauth/access_token/:client_id/:client_secret/:grant_type/:redirect_uri/:code', api.oauth_access_token); 
app.post('/api/oauth/access_token', api.oauth_access_token);
app.get('/api/oauth/access_token', api.oauth_access_token);
app.post('/api/oauth/session',api.oauth_session);

app.get('/api/users/feed',api.list_users_feed); // TODO
app.get('/api/users/profile', api.list_users_profile); // TODO

//app.get('/api/error', api.oauth_error);

//******** SECURED API :

//favplace
app.post('/api/favplace/:userid', api.requiresToken, api.add_favplace); 
app.delete('/api/favplace/:userid', api.requiresToken, api.del_favplace); 
app.get('/api/favplace/:userid', api.requiresToken, api.list_favplace); 
app.put('/api/favplace/:userid', api.requiresToken, api.put_favplace); 
// for non restfull guys
app.post('/api/delfavplace/:userid', api.requiresToken, api.del_favplace); 
app.post('/api/updatefavplace/:userid', api.requiresToken, api.put_favplace); 

// user subscribtion to other user's news feeds
app.post('/api/subscribe/user/:userid', api.requiresToken, api.add_subs_user); 
app.put('/api/subscribe/user/:userid', api.requiresToken, api.put_subs_user); 
app.delete('/api/subscribe/user/:userid', api.requiresToken, api.del_subs_user); 
app.get('/api/subscribe/user/:userid', api.requiresToken, api.list_subs_user);
// for non restfull guys
app.post('/api/unsubscribe/user/:userid', api.requiresToken, api.del_subs_user); 
app.post('/api/updatesubscribe/user/:userid', api.requiresToken, api.put_subs_user); 

// user subscribtion to tags
app.post('/api/subscribe/tag/:userid', api.requiresToken, api.add_subs_tag); 
app.put('/api/subscribe/tag/:userid', api.requiresToken, api.put_subs_tag); 
app.delete('/api/subscribe/tag/:userid', api.requiresToken, api.del_subs_tag); 
app.get('/api/subscribe/tag/:userid', api.requiresToken, api.list_subs_tag);
// for non restfull guys
app.post('/api/unsubscribe/tag/:userid', api.requiresToken, api.del_subs_tag); 
app.post('/api/updatesubscribe/tag/:userid', api.requiresToken, api.put_subs_tag); 



 
//app.get('/api/users/:userid/:access_token',api.requiresToken, api.users_details);
app.get('/api/user/:userid',api.requiresToken, api.get_users_details);
app.post('/api/user/:userid',api.requiresToken, api.post_users_details);
app.put('/api/user/:userid',api.requiresToken, api.put_users_details);

app.get('/api/user/feed/:userid', api.get_user_feed);
app.post('/api/user/feed/:userid',api.requiresToken, api.add_users_feed);
app.delete('/api/user/feed/:userid',api.requiresToken, api.del_users_feed);
app.put('/api/user/feed/:userid',api.requiresToken, api.put_users_feed);



//app.post('/api/users/feed/:userid/:count', api.post_users_feed);

app.get('/api/users/search/:string', api.users_search);


 




// DOCS
app.get('/docs/api', routes.docs_api);


// redirect all others to the index (HTML5 history)
app.get('*', routes.index);



//io = require('socket.io');
//sio = io.listen(app);
/*		
function requiresLogin(req,res,next){
	if(req.session.user){
		next();
	}else{
		req.session.message = 'Please login to access this section:';
		res.redirect('/user/login?redir='+req.url);
	}
}*/

function requiresPosition(req,res,next){
	delete req.session.position;
	
	if(!req.session.position){
		sio.sockets.on('connection', function (socket) {
		  //socket.emit('news', { hello: 'world' });
		  socket.on('position', function (data) {
			req.session.position = data.x;
			//console.log(data);
			next();
		  });
		});
	}else{
		next();
	}
		
	next();
	
}
// Start server

app.listen(conf.port, function(){
  console.log("Express server listening on port %d in %s mode", conf.port, app.settings.env);
});
