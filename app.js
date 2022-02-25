const express = require('express');
//Initialize app
const app = express();
//other stuff
const session = require('express-session');
const path = require('path');
const fs = require('fs'); //filesync
const crypto = require("crypto");


app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.set('view engine', 'pug') //Use pug for templates. 
app.set('views', './fe/templates'); //Set template directory
app.use(express.static(__dirname + '/fe/public')); //Set static file directory

//Load config
let config = JSON.parse(fs.readFileSync('config.json'));

function reloadConfig() {
  config = JSON.parse(fs.readFileSync('config.json'));
  return config;
}

//Load errors
let errors = JSON.parse(fs.readFileSync(config['server']['errors']));

//Load database connection info from config
const mysql = require('mysql');
const { response } = require('express');
const connection = mysql.createConnection({
  host: config['database']['host'],
  user: config['database']['user'],
  password: config['database']['password'],
  database: config['database']['name']
})

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/static' + '/login.html'));
});


app.get('/home', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin) {
		// Output username
		response.send('Welcome back, ' + request.session.username + '!');
	} else {
		// Not logged in
		response.send('Please login to view this page!');
	}
	response.end();
});

app.get('/', function(request, response) {
	// Render login template
	response.sendFile(path.join(__dirname + '/static' + '/login.html'));
});

app.get('/register', function(req, res) {
  res.render('register', {config: reloadConfig()})
});



//register account
app.post('/api/register', (req, res) => {
  if (config['settings']['registrations'] != 'on') { //Check if registrations are disabled. Return error if they are. 
    res.send(errors['registrationsDisabled']);
    res.end();
  }
	let username = req.body.username;
	let password = req.body.password;
  let email = req.body.email;
  if (username && password && email) { //Check if all required information is present
		connection.query('SELECT * FROM accounts WHERE username = ? OR email = ?', [username, email], function(err , rows) {
      console.log(rows);
			if (err) throw err;
			if (rows.length > 0) { //Account already exists.  
        if (rows[0].username == username) { //Account with same username exists
          response.send(errors['usernameExists']);
          response.end();
        }
        if (rows[0].email == email) { //Account with email exists
          response.send(errors['emailExists']);
          response.end();
        }
			}
      let inv = null; //Initialize invite
      let invBy = null; //Initialize invited by
      if (config['server']['invites'] == 'on') { //Check if invites are enabled
        let invite = req.body.invite;
        connection.query('SELECT * FROM invites WHERE invite = ?', [invite], (err, rows) => {
          if (err) throw err
          if (rows.length == 0) { //Invite doesn't exist
            response.send(errors['invalidInvite']);
            response.end();
          }
          if (rows[0].maxUses <= rows[0].uses) { //Invite has no more uses left
            response.send(errors['invalidInvite']);
            response.end();
          }
          inv = invite; //If all the checks pass, the invite can be used
          invBy = rows[0].creator; //Sets invited by to ID of invite creator
        })
      }
      password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password+salt
      let token = crypto.createHash('sha256').update(username+password+config['server']['salt']).digest('base64'); //User Token
      console.log(inv);
      connection.query(`INSERT INTO accounts (id, username, email, password, token, group, invite, invitedBy, joinDate) VALUES (NULL, ${username}, ${email}, ${password}, ${token}, 2, ${inv}, ${invBy}, ${Date.now})`, (err, rows) => {
        if (err) throw err
      })
			res.end();
		}); 
  } else {
    response.send(errors['unfilledFields']);
    response.end();
  }

})
//log in
app.post('/api/auth', function(req, res) {
	let username = req.body.username;
	let password = req.body.password;
	if (username && password) {
    password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password
    console.log(password)
		connection.query('SELECT * FROM accounts WHERE username = ? OR email = ? AND password = ?', [username, username, password], function(err, rows) {
      console.log(rows);
			if (err) throw err;
			if (rows.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/home');
			} else {
				res.send(errors['invalidLogin']);
			}			
			res.end();
		});
    } else {
        res.send(errors['loginInfoMissing']);
        res.end();
    }
});




app.listen(config['server']['port'], () => {
  console.log(`App started on port ${config['server']['port']}`)
})