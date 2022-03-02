const express = require('express');
//Initialize app
const app = express();
//other stuff
const session = require('express-session');
const path = require('path');
const fs = require('fs'); //filesync
const crypto = require("crypto");
const multer = require('multer');
const os = require('os');
const md5File = require('md5-file')
var cookies = require("cookie-parser");
const { body } = require('express-validator');
app.use(cookies());
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
app.use('/files', express.static(__dirname + '/files'));
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
//set up multer
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, config['upload']['path']+"/")
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname))
    }
  }),
  fileFilter: function(req, file, cb) { 
    if(config['upload']['banned-mimes'].includes(file.mimetype)) { //Mimetype validation
      cb(null, false);
      return cb(new Error('File type not allowed'));
    }
    cb(null, true)
    if(file.size > config['upload']['max-file-size']) { //File size validation
      cb(null, false);
      return cb(new Error('File too large'));
    }
  }
});


//Middleware to set up session
function setSession (req, res, next) {
  if (!req.session.loggedin) {
    req.session.loggedin = false; //Set logged in to false by default
  }
  if (!req.session.group) {
    req.session.group = 999; //Set group to 999 by default
  }
  if (!req.cookies.theme) {
    res.cookie('theme', "dark");
  }
  req.session.toast = false; //Set toast to false by default
  next()
}
app.use(setSession);

//Convert bytes to mb
function convertBytes(bytes) {
  return (bytes / (1024*1024)).toFixed(2);
}
//Terms of Service and Privacy Policy
app.get('/tos', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('tos', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.get('/privacy', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('privacy', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})



//Register page
app.get('/register', function(req, res) {
  if (req.session.loggedin == true) {
    req.session.toast = ["#6272a4","You are already signed in"];
    res.status(200).render('home', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme})
  } else {
    res.status(200).render('register', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme});
  }
});
//Login page
app.get('/login', function(req, res) {
  if (req.session.loggedin == true) {
    req.session.toast = ["#6272a4","You are already signed in"];
    res.status(200).render('home', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme })
  } else {
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
});
//log out
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.status(200).redirect('login');
});
//Home page
app.get('/home', function(req, res) {
  if (req.session.loggedin == true) {
    let spaceUsed = 0;
    let spaceTotal = convertBytes(config['groups'][req.session.group.toString()]['default-storage']);
    let files = [];
    connection.query(`SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY date DESC`, (err, rows) => {
      if (err) throw err;
      rows.forEach(row => { //Get total space used
        spaceUsed += row.size;
      });
      files = rows.slice(0, 4)
      spaceUsed = convertBytes(spaceUsed); //Convert bytes to mb
      res.status(200).render('home', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, files: files, spaceUsed: spaceUsed, spaceTotal: Math.round(spaceTotal), path: "home"});
    })
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
});
//Upload page
app.get('/upload', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('upload', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, path: "upload"})
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
//Paste page
app.get('/paste', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('paste', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, path: "paste"})
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
//Gallery page
app.get('/gallery', function(req, res) {
  if (req.session.loggedin == true) {
    let files = [];
    connection.query(`SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY date DESC`, (err, rows) => {
      if (err) throw err;
      files = rows;
      console.log(files);
      res.status(200).render('gallery', {config: reloadConfig(), files: files, session:req.session, appTheme : req.cookies.theme, path: "gallery"})
    })
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})

//register account
app.post('/register', body('email').isEmail().normalizeEmail(), body('username').not().isEmpty().trim().escape(),(req, res) => {
  if (config['settings']['registrations'] != 'on') { //Check if registrations are disabled. Return error if they are. 
    res.json(errors['registrationsDisabled']);
  }
	let username = req.body.username;
	let password = req.body.password;
  let email = req.body.email;
  if (username && password && email) { //Check if all required information is present
    if (RegExp('^[a-zA-Z0-9_.-]*$').test(username) == true) { //Make sure that only some characters are allowed    
      connection.query('SELECT * FROM accounts WHERE username = ? OR email = ?', [username, email], function(err , rows) {
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
        connection.query(`INSERT INTO accounts VALUES (NULL, '${username}', '${email}', '${password}', '${token}', ${config['groups']['3']['id']}, ${inv}, ${invBy}, ${Date.now()}, "${req.socket.remoteAddress}")`, (err, rows) => {
          if (err) throw err
        })
        req.session.toast = ["#6272a4","Account created"];
        res.status(201).redirect('login');
        return;
      }); 
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    res.status(417).json(errors['unfilledFields']);
    return;
  }
})
//log in
app.post('/auth', function(req, res) {
	let username = req.body.username;
	let password = req.body.password;
  if (RegExp('^[a-zA-Z0-9@_.-]*$').test(username) == true) { //Username and email regex. 
    if (username && password) {
      password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password
      connection.query(`SELECT * FROM accounts WHERE password='${password}' AND username='${username}' OR email='${username}'`, function(err, rows) {
        if (err) throw err;
        if (rows.length > 0) {
          req.session.loggedin = true;
          req.session.username = username;
          req.session.group = rows[0].group;
          req.session.uid = rows[0].id;
          req.session.toast = ["#6272a4","Successfully signed in"];
          res.status(200).redirect('home');
        } else {
          res.status(406).json(errors['invalidLogin']);
        }			
      });
      } else {
          res.status(417).json(errors['loginInfoMissing']);
      }
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
});

//Upload file
app.post('/upload', upload.any('uploads'), function(req, res) {
  if (req.session.loggedin == false) { //Check if user is logged in
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
  if (!req.files) { //Check if files are present
    return res.status(400).send(errors['missingFiles']);
  }
  let files = req.files;
  let body = req.body;
  returnFiles = new Array();
  files.forEach(file => {
    let hash = md5File.sync(file.path); //Get MD5 hash of file
    connection.query(`INSERT INTO files VALUES ('${hash.substring(0,8)}', '${file.originalname}', '${file.filename}', ${req.session.uid}, ${Date.now()}, '${hash}', ${file.size}, '${file.mimetype}')`, function(err, rows) {
      if (err) throw err;
    });
    returnFiles.push({"filename":file.originalname, path:`/files/${file.filename}`});
  });
  return res.status(200).json(returnFiles);

});


app.listen(config['server']['port'], () => {
  console.log(`App started on port ${config['server']['port']}`)
})