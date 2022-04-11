const express = require('express');
//Initialize app
const app = express();
app.use(express.json());
//Load config
const fs = require('fs'); //filesync
let config = JSON.parse(fs.readFileSync('config.json'));
function reloadConfig() {
  config = JSON.parse(fs.readFileSync('config.json'));
  return config;
}
app.use(express.json({limit: config['server']['request_size_limit'], extended: true}));
app.use(express.urlencoded({limit: config['server']['request_size_limit'], extended: true, parameterLimit:50000}));
//other stuff
const session = require('express-session');
const path = require('path');
const crypto = require("crypto");
const multer = require('multer');
const os = require('os');
const md5File = require('md5-file');
const url = require('url');
const decode = require('unescape');
var cookies = require("cookie-parser");
var sizeOf = require('image-size');
const { body, validationResult } = require('express-validator');
app.use(cookies());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.set('view engine', 'pug') //Use pug for templates. 
app.set('views', './fe/templates'); //Set template directory
app.use(express.static(__dirname + '/fe/public')); //Set static file directory
app.use('/files', express.static(__dirname + '/files'));
//Load errors
let errors = JSON.parse(fs.readFileSync(config['server']['errors']));
//Load database connection info from config
const mysql = require('mysql');
const { response } = require('express');
const { connect } = require('http2');
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
//Decode base64 string
function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};
  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }
  response.type = matches[1];
  response.data = new Buffer.from(matches[2], 'base64');
  return response;
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
    let queryUrl = url.parse(req.url, true).query;
    let files = []; //Initiate files array
    let limit = 15; //Default limit
    let sort = "new-old"; //Default sort
    let name = queryUrl.filter; //Initiate name
    if (queryUrl.limit) { //Get display limit
      limit = queryUrl.limit;
    }
    let queries = {
      "new-old": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY date DESC`,
      "old-new": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY date ASC`,
      "name-desc": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY name DESC`,
      "name": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY name ASC`,
      "type": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY mime DESC`,
      "size-desc": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY size DESC`,
      "size": `SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY size ASC`,
      "filter": `SELECT * FROM files WHERE owner=${req.session.uid} AND (name LIKE '%${name}%' OR filename LIKE '%${name}%')  ORDER BY name ASC`
    };
    let query = queries[sort]; //Initiate query
    if (queryUrl.sort) { //Sort by date, name, size, or type
      query = queries[sort];
    }
    if (queryUrl.filter) { //Name filter
      query = queries["filter"];
    }
    connection.query(query, (err, rows) => {
      if (err) throw err;
      files = rows;
      res.status(200).render('gallery', {config: reloadConfig(), files: files.slice(0, limit), sort, session:req.session, appTheme: req.cookies.theme, path: "gallery", currentPath: req.path})
    })
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})

//Paste page
app.get('/pastes/:id', function(req, res) {
  let id = req.params.id;
  connection.query(`SELECT * FROM pastes WHERE id='${id}'`, (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      let paste = rows[0];
      res.status(200).render('pasteContent', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, paste: paste, content: decode(paste['content']).replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'"),path: "paste"})
    } else {
      res.status(404).render('404', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
    }
  })
})
app.get('/pastes/raw/:id', function(req, res) { 
  let id = req.params.id;
  connection.query(`SELECT * FROM pastes WHERE id='${id}'`, (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      let paste = rows[0];
      res.status(200).send(`<pre>${decode(paste['content']).replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'")}</pre>`)
    } else {
      res.status(404).render('404', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
    }
  })
})

//User account page
app.get('/user/:user', function(req, res) {
  if (req.session.loggedin == true) {
    var user = req.params['user'];
    if (RegExp('^[a-zA-Z0-9_.-]*$').test(user) == true) {
      connection.query(`SELECT * FROM accounts WHERE username='${user}'`, (err, rows) => {
        if(rows.length == 0) { //User doesn't exist in DB
          res.sendStatus(404);
        }
        var date = new Date(rows[0].joinDate).toLocaleDateString("en-US");
        res.status(200).render('account', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user:rows[0], date: date, path: "account"});
      })
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});    
  }
})
//Account management page
app.get('/user/:user/edit', function(req, res) {
  if (req.session.loggedin == true) {
    var user = req.params['user'];
    if (RegExp('^[a-zA-Z0-9_.-]*$').test(user) == true && req.session.username == user) {
      connection.query(`SELECT * FROM accounts WHERE username='${user}'`, (err, rows) => {
        if(rows.length == 0) { //User doesn't exist in DB
          res.sendStatus(404);
        }
        var date = new Date(rows[0].joinDate).toLocaleDateString("en-US");
        res.status(200).render('editProfile', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user:rows[0], date: date, path: "account"});
      })
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});    
  }
})
app.get("/invites", function(req, res) {
  if (req.session.loggedin == true) {
    connection.query(`SELECT * FROM accounts WHERE id=${req.session.uid}`, (err, rows) => {
      var user = rows[0];
      connection.query(`SELECT * FROM invites WHERE creator=${req.session.uid}`, (err, rows) => {
        if(!rows) {
          rows = [];
        }
        res.status(200).render('invites', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, invites: rows, user: user, path: "invites"});
      })
    })
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});    
  }
}) 
app.post('/user/:user/update', body('bio').optional({checkFalsy: true}).trim().escape().isLength({max:250}), body('twitter').optional({checkFalsy: true}).trim().escape().isLength({ max:16 }), body('website').optional({checkFalsy: true}).trim().isURL().isLength({ max:30 }), body('location').trim().escape().isLength({ max:30 }).optional({checkFalsy: true}), function(req, res) { 
  if (req.session.loggedin == true) {
    let user = req.params['user'];
    let bio = req.body.bio;
    let twitter = req.body.twitter;
    let location = req.body.location;
    if(twitter) {
      twitter = twitter.replace("@","")
    }
    let website = req.body.website
    if(website.startsWith("http://") == false && website.startsWith("https://") == false) {
      if(website != "") {
        website = "https://"+website;
      }
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) { //Return validator errors
      return res.status(400).json({ errors: errors.array() });
    }
    if (RegExp('^[a-zA-Z0-9_.-]*$').test(user) == true && req.session.username == user) {
      connection.query(`UPDATE accounts SET bio='${bio}', twitter='${twitter}', website=${website == "" ? null:"'"+website+"'"}, location='${location}'`, (err, rows) => {
        if (err) throw err;
        res.status(200).redirect("/user/"+user);
      })
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.post("/banner/upload", (req, res) => {
  if (req.session.loggedin == false) { //Check if user is logged in
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
  if (req.body.payload) { //Check if file is present
    var bannerData = decodeBase64Image(req.body.payload);
    let dimensions = sizeOf(Buffer.from(bannerData.data, 'base64'));
    if (dimensions.width == 950 && dimensions.height == 200) { //Check if files are the correct size
      fs.writeFile(`./${config['upload']['banner-path']}/${req.session.uid}.png`, bannerData.data, function(err) { 
        if(err) {
          console.log(err);
          return res.status(500).send(errors['fileWriteError']);
        }
      });
      connection.query(`UPDATE accounts SET banner='/${config['upload']['banner-path']}/${req.session.uid}.png'`, function(err, rows) {
        if (err) throw err;
        res.status(200);
      });
    } else {
      return res.status(400).send(errors['invalidDimensions']);
    }
  } else {
    return res.status(400).send(errors['missingFiles']);
  }
})

//register account
app.post('/register', body('email').isEmail().normalizeEmail(), body('username').not().isEmpty().trim().escape(), body('invite').optional({checkFalsy: true}).trim().escape().isLength({ max:25 }), (req, res) => {
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
        connection.query(`INSERT INTO accounts VALUES (NULL, '${username}', '${email}', '${password}', '${token}', ${config['groups']['3']['id']}, ${inv}, ${invBy}, ${Date.now()}, "${req.socket.remoteAddress}", NULL, '/images/default.png', NULL, NULL, NULL, NULL, ${config['groups']['3']['invites']})`, (err, rows) => {
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
app.post('/auth', body('username').not().isEmpty().trim().escape(), function(req, res) {
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

app.post('/paste', body("content").escape(), body("title").optional({checkFalsy: true}).trim().escape(), body("syntax").optional({checkFalsy: true}).trim().escape(), function(req, res) {
  if (req.session.loggedin == true) { //Check if user is logged in
    let title = req.body.title;
    let content = req.body.content;
    let burn = req.body.burn;
    let syntax = req.body.syntax;
    if(!title) {
      title = "Untitled";
    }
    if(!content) {
      res.status(406).json(errors['missingContent']);
      return;
    }
    if(!burn) {
      burn = 0;
    }
    if(!syntax) {
      syntax = 'none'
    }
    let r = /[^A-Za-z0-9]/g;
    let id = crypto.createHash('sha256').update(title+content+req.session.uid+Date.now()).digest('base64').substring(1,10).replace(r, ""); //Generate id based on title, content, user, and time
    connection.query(`INSERT INTO pastes VALUES ('${id}', ${req.session.uid}, '${title}', '${content}', ${burn == 1 ? 1 : 0}, ${!syntax ? null : "'"+syntax+"'"}, ${Date.now()})`, function(err, rows) {
      if (err) throw err;
      res.status(200).json({"url":"/pastes/"+id});
    });
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.post('/invites/generate', body("maxUses").optional({checkFalsy: true}).isNumeric().default(1), function(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  if (req.session.loggedin == true) { //Check if user is logged in
    let maxUses = req.body.maxUses;
    if(!maxUses) {
      maxUses = 1;
    }
    if(maxUses > 1) {
      if(req.session.group > 1) {
        maxUses = 1;
      }
    }
    if(maxUses == 0) {
      maxUses = 1;
    }
    connection.query(`SELECT * FROM accounts WHERE id=${req.session.uid}`, function(err, rows){
      if (err) throw err;
      if (rows[0].invites > 0) {
        let r = /[^A-Za-z0-9]/g;
        let token = crypto.createHash('sha256').update(req.session.username+req.session.uid+config['server']['salt']+Date.now()).digest('base64').substring(1,25).replace(r, ""); //User Token
        connection.query(`UPDATE accounts SET invites=invites-1 WHERE id=${req.session.uid}`, function(err, rows) {
          if (err) throw err;
        });
        connection.query(`INSERT INTO invites VALUES ('${token}', ${req.session.uid}, ${maxUses}, 0, ${Date.now()})`, function(err, rows) {
          if (err) throw err;
          res.status(200).json({"invite":token, "maxUses":maxUses});
        });
      } else {
        res.status(406).json({"err": errors['noInvites']});
      }
    }) 
  } else {
    req.session.toast = ["#6272a4","You are not signed in"];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})

app.listen(config['server']['port'], () => {
  console.log(`App started on port ${config['server']['port']}`)
})