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



//Register page
app.get('/register', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('home', {config: reloadConfig(), session:req.session, toast:["true","#6272a4","You are already signed in"]})
  } else {
    res.status(200).render('register', {config: reloadConfig(), toast:['false']});
  }
});
//Login page
app.get('/login', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('home', {config: reloadConfig(), session:req.session, toast:["true","#6272a4","You are already signed in"]})
  } else {
    res.status(200).render('login', {config: reloadConfig(), toast:["false"]});
  }
});
app.get('/home', function(req, res) {
  console.log(req.session.group)
  if (req.session.loggedin == true) {
    res.status(200).render('home', {config: reloadConfig(), session:req.session})
  } else {
    res.status(200).render('login', {config: reloadConfig(), toast:["true","#ff5555","Please sign in"]});
  }
  
});


//register account
app.post('/api/register', (req, res) => {
  if (config['settings']['registrations'] != 'on') { //Check if registrations are disabled. Return error if they are. 
    res.json(errors['registrationsDisabled']);
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
          res.status(406).json(errors['usernameExists']);
          return;
        }
        if (rows[0].email == email) { //Account with email exists
          res.status(406).json(errors['emailExists']);
          return;
        }
			}
      let inv = null; //Initialize invite
      let invBy = null; //Initialize invited by
      if (config['server']['invites'] == 'on') { //Check if invites are enabled
        let invite = req.body.invite;
        connection.query('SELECT * FROM invites WHERE invite = ?', [invite], (err, rows) => {
          if (err) throw err
          if (rows.length == 0) { //Invite doesn't exist
            res.status(406).json(errors['invalidInvite']);
            return;
          }
          if (rows[0].maxUses <= rows[0].uses) { //Invite has no more uses left
            res.status(406).json(errors['invalidInvite']);
            return;
          }
          inv = invite; //If all the checks pass, the invite can be used
          invBy = rows[0].creator; //Sets invited by to ID of invite creator
        })
      }
      password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password+salt
      let token = crypto.createHash('sha256').update(username+password+config['server']['salt']).digest('base64'); //User Token
      if(inv != null) { //Allows the SQL query to insert NULL properly. 
        inv = `'${inv}'`
      }
      connection.query(`INSERT INTO accounts VALUES (NULL, '${username}', '${email}', '${password}', '${token}', 2, ${inv}, ${invBy}, ${Date.now()})`, (err, rows) => {
        if (err) throw err
      })
      res.status(201).render('login', {config: reloadConfig(), toast:["true","#6272a4","Account created, please sign in"]});
      return;
		}); 
  } else {
    res.status(417).json(errors['unfilledFields']);
    return;
  }
})
//log in
app.post('/api/auth', function(req, res) {
	let username = req.body.username;
	let password = req.body.password;
	if (username && password) {
    password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password
		connection.query('SELECT * FROM accounts WHERE username = ? OR email = ? AND password = ?', [username, username, password], function(err, rows) {
      console.log(rows[0])
			if (err) throw err;
			if (rows.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
        req.session.group = rows[0].group;
        console.log(req.session.group);
				res.status(200).render('home', {config: reloadConfig(), session:req.session, toast:["true","#6272a4","Successfully signed in"]});
			} else {
				res.status(406).json(errors['invalidLogin']);
			}			
		});
    } else {
        res.status(417).json(errors['loginInfoMissing']);
    }
});

//log out
app.get('/logout', function(req, res) {
  req.session.destroy(); //Destroy all session data
  res.status(200).render('login', {config: reloadConfig(), toast:["true","#6272a4","Successfully signed out"]});
});


app.listen(config['server']['port'], () => {
  console.log(`App started on port ${config['server']['port']}`)
})