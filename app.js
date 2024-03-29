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
const fetch = require('node-fetch');
var cookies = require("cookie-parser");
var sizeOf = require('image-size');
const { body, validationResult } = require('express-validator');
app.use(cookies());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'static')));
app.set('view engine', 'pug') //Use pug for templates. 
app.set('views', './fe/templates'); //Set template directory
app.use(express.static(__dirname + '/fe/public')); //Set static file directory
app.use('/files', express.static(__dirname + '/files'));
//Load errors
let errors = JSON.parse(fs.readFileSync(config['server']['errors']));
//Load database connection info from config
const mysql = require('mysql');
const { response, application } = require('express');
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
      return cb(true, {"error": errors['bannedFileType']});
    }
    cb(null, true)
    if(file.size > config['upload']['max-file-size']) { //File size validation
      cb(null, false);
      return cb(true, {"error": errors['fileTooLarge']});
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
    req.cookies.theme = "dark"; //Set theme to dark by default
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
  res.status(200).render('tos', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
})
app.get('/privacy', function(req, res) {
  res.status(200).render('privacy', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
})



//Register page
app.get('/register', function(req, res) {
  if (req.session.loggedin == true) {
    req.session.toast = ["#6272a4","You are already signed in"];
    res.status(200).redirect('home');
  } else {
    let queryUrl = url.parse(req.url, true).query;
    let invite = queryUrl.invite;
    res.status(200).render('register', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, invite:invite});
  }
});
//Login page
app.get('/login', function(req, res) {
  if (req.session.loggedin == true) {
    req.session.toast = ["#6272a4","You are already signed in"];
    res.status(200).redirect('home');
  } else {
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme});
  }
});
//log out
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.status(200).redirect('login');
});
//Landing page
app.get('/', function(req, res) {
  res.status(200).render('index', {config: reloadConfig(), appTheme : req.cookies.theme, session:req.session, path: "/"});
})
//Home page
app.get('/home', function(req, res) {
  if (req.session.loggedin == true) {
    let spaceUsed = 0;
    let spaceTotal = convertBytes(config['groups'][(req.session.group-1).toString()]['default-storage']);
    let files = [];
    connection.query(`SELECT * FROM files WHERE owner=${req.session.uid} ORDER BY date DESC`, (err, rows) => {
      if (err) throw err;
      rows.forEach(row => { //Get total space used
        spaceUsed += row.size;
      });
      files = rows.slice(0, 4)
      spaceUsed = convertBytes(spaceUsed); //Convert bytes to mb
      connection.query(`SELECT * FROM accounts WHERE id=${req.session.uid}`, (err, rows) => {
        if (err) throw err;
        res.status(200).render('home', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, files: files, user:rows[0], spaceUsed: spaceUsed, spaceTotal: Math.round(spaceTotal), path: "home"});
      })
    })
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
});
//Upload page
app.get('/upload', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('upload', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, path: "upload"})
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
//Paste page
app.get('/paste', function(req, res) {
  if (req.session.loggedin == true) {
    res.status(200).render('paste', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, path: "paste"})
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
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
    if(queryUrl.sort) {
      sort = queryUrl.sort;
    }
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
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
//Paste gallery page
app.get('/gallery/pastes', function(req, res) {
  if (req.session.loggedin == true) {
    let queryUrl = url.parse(req.url, true).query;
    let pastes = []; //Initiate pastes array
    let limit = 15; //Default limit
    let sort = "new-old"; //Default sort
    if(queryUrl.sort) {
      sort = queryUrl.sort;
    }
    let name = queryUrl.filter; //Initiate name
    if (queryUrl.limit) { //Get display limit
      limit = queryUrl.limit;
    }
    let queries = {
      "new-old": `SELECT * FROM pastes WHERE owner=${req.session.uid} ORDER BY date DESC`,
      "old-new": `SELECT * FROM pastes WHERE owner=${req.session.uid} ORDER BY date ASC`,
      "title-desc": `SELECT * FROM pastes WHERE owner=${req.session.uid} ORDER BY title DESC`,
      "title": `SELECT * FROM pastes WHERE owner=${req.session.uid} ORDER BY title ASC`,
      "filter": `SELECT * FROM pastes WHERE owner=${req.session.uid} AND (title LIKE '%${name}%')  ORDER BY name ASC`
    };
    let query = queries[sort]; //Initiate query
    if (queryUrl.sort) { //Sort by date or title
      query = queries[sort];
    }
    if (queryUrl.filter) { //Name filter
      query = queries["filter"];
    }
    connection.query(query, (err, rows) => {
      if (err) throw err;
      pastes = rows;
      res.status(200).render('pastes', {config: reloadConfig(), pastes: pastes.slice(0, limit), sort, session:req.session, appTheme: req.cookies.theme, path: "gallery", currentPath: req.path})
    })
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
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
      if(paste['burn'] == 1) { //Delete paste so it can't be accessed again
        connection.query('DELETE FROM pastes WHERE id=?', [id], (err, rows) => {
          if (err) throw err;
        })
      }
      if (paste['password'] == null) { //Paste has no password, so can be rendered safely. 
        res.status(200).render('pasteContent', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, paste: paste, content: decode(paste['content']).replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'").replace(/&#x5C;/g, "\\"),path: "paste"})
      } else { //Render password input site instead
        res.status(200).render('pasteAuth', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, paste: paste, raw: "false", path: "pasteAuth"})
      }
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
      if(paste['burn'] == 1) { //Delete paste so it can't be accessed again
        connection.query('DELETE FROM pastes WHERE id=?', [id], (err, rows) => {
          if (err) throw err;
        })
      }
      if (paste['password'] == null) { //Paste has no password, so can be rendered safely. 
        res.status(200).send(`<pre>${decode(paste['content']).replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'").replace(/&#x5C;/g, "\\")}</pre>`)
      } else { //Render password input site instead
        res.status(200).render('pasteAuth', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, paste: paste, raw: "true", path: "pasteAuth"})
      }
    } else {
      res.status(404).render('404', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
    }
  })
})
app.post('/pastes/auth/:id', body("password").escape(), (req, res) => {
  let id = req.params.id;
  connection.query(`SELECT * FROM pastes WHERE id='${id}'`, (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      let paste = rows[0];
      if (paste['password'] == crypto.createHash('sha256').update(req.body.password+config['server']['salt']).digest('base64')) {
        if (req.body.raw == "false") {
          res.status(200).render('pasteContent', {config: reloadConfig(), session:req.session, appTheme : req.cookies.theme, paste: paste, content: decode(paste['content']).replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'").replace(/&#x5C;/g, "\\"),path: "paste"})
        } else {
          res.status(200).send(`<pre>${decode(paste['content']).replace(/&#x2F;/g, "/").replace(/&#x27;/g, "'").replace(/&#x5C;/g, "\\")}</pre>`)
        }
      } else {
        res.status(406).json("Invalid password");
      }
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
        if(rows.length > 0) { //User doesn't exist in DB

          let account = rows[0];
          var date = new Date(rows[0].joinDate).toLocaleDateString("en-US");
          if(account.invitedBy != null) {
            connection.query(`SELECT * FROM accounts WHERE id=${account.invitedBy}`, (err, rows) => {
              let inviter;
              if (rows.length > 0) {
                inviter = rows[0].username;
              } else {
                inviter = null;
              }
              res.status(200).render('account', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user:account, invBy: inviter, date: date, path: "account"});
            })
          } else {
            res.status(200).render('account', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user:account, invBy: null, date: date, path: "account"});
          }
        } else {
          res.status(404).render('404', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
        }
      });
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
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
        let account = rows[0];
        var date = new Date(rows[0].joinDate).toLocaleDateString("en-US");
        if(account.invitedBy != null) {
          connection.query(`SELECT * FROM accounts WHERE id=${account.invitedBy}`, (err, rows) => {
            let inviter;
            if (rows.length > 0) {
              inviter = rows[0].username;
            } else {
              inviter = null;
            }
            res.status(200).render('editProfile', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user:account, invBy: inviter, date: date, path: "account"});
          })
        } else {
          res.status(200).render('editProfile', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user:account, invBy: null, date: date, path: "account"});
        }
      })
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
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
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});    
  }
})
app.get("/settings/auth", async function(req, res) {
  if (req.session.loggedin == true) {
    if(config.settings['discord-login'] == 'on') {
      let code = url.parse(req.url, true).query.code; //Get the code from the query string
      if(code) { //If there is a code
        var body = { //Create the body for the request
          'client_id': config.discord.discord_client_id,
          'client_secret': config.discord.discord_client_secret,
          'grant_type': 'authorization_code',
          'code': code,
          'redirect_uri': config.discord.discord_redirect_uri,
        }
        var auth = await fetch("https://discord.com/api/v10/oauth2/token", { //Request to authorize using the code given
            method: 'POST',
            body: new URLSearchParams(Object.entries(body)).toString(),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        }).catch(err => {
          console.log(err);
        });
        var authResponse = await auth.json();
        if(authResponse.access_token) { //If the request was successful
          var user = await fetch("https://discord.com/api/v10/users/@me", { //Request to get the user's information
            method: 'GET',
            headers: {'Authorization': `Bearer ${authResponse['access_token']}`}
          });
          var user = await user.json(); //User's information
          if(user.id) {
            //res.status(200).json(user);
            connection.query(`UPDATE accounts SET discord_id='${user.id}', discord_avatar='${user.avatar}', discord_username='${user.username}#${user.discriminator}' WHERE id=${req.session.uid}`, (err, rows) => {
              if(err) {
                console.log(err);
              }
              res.status(200).send("<script>window.close();</script > ");
            })
          } else {
            res.status(400).json(user);
          }
        } else { //If the request was unsuccessful
          res.status(400).json(authResponse);
        }
      }
    } else {
      res.status(400).json(errors['signInMethodDisabled']);
    }
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.post("/settings/auth/revoke", function(req, res) {
  if (req.session.loggedin == true) {
    if(config.settings['discord-login'] == 'on') {
      connection.query(`UPDATE accounts SET discord_id=NULL, discord_avatar=NULL, discord_username=NULL WHERE id=${req.session.uid}`, (err, rows) => {
        if(err) {
          console.log(err);
        }
        res.status(200).send("Discord Unlinked");
      })
    } else {
      res.status(400).json(errors['signInMethodDisabled']);
    }
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.post("/settings/api/regenerate", function(req, res) {
  if (req.session.loggedin == true) {
    let newKey = crypto.randomBytes(32).toString('hex').substring(0,20);
    connection.query(`UPDATE accounts SET api_key='${newKey}' WHERE id=${req.session.uid}`, (err, rows) => {
      if(err) {
        console.log(err);
      }
      res.status(200).json({"api_key": newKey});
    })
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.get("/settings", function(req, res) {
  if (req.session.loggedin == true) {
    connection.query(`SELECT * FROM accounts WHERE id=${req.session.uid}`, (err, rows) => {
      var user = rows[0];
      res.status(200).render('settings', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, user: user, path: "settings"});
    })
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});    
  }
})
app.post("/settings/password", function(req, res) {
  if (req.session.loggedin == true) {
    if(req.body.oldPassword && req.body.repeatPassword && req.body.newPassword) {
      if(req.body.newPassword == req.body.repeatPassword) { //Check if the new password is the same as the repeat password
        connection.query(`SELECT * FROM accounts WHERE id=${req.session.uid}`, (err, rows) => {
          var user = rows[0];
          oldPassword = crypto.createHash('sha256').update(req.body.oldPassword+config['server']['salt']).digest('base64'); //Hash the old password
          newPassword = crypto.createHash('sha256').update(req.body.newPassword+config['server']['salt']).digest('base64'); //Hash the new password
          if(user.password == oldPassword) { //Check if old password is correct
            if(user.password != newPassword) { //Check if the new password is the same as the old password
              connection.query(`UPDATE accounts SET password='${newPassword}' WHERE id=${req.session.uid}`, (err, rows) => {
                if(err) {
                  console.log(err);
                }
                res.status(200).send("Password Changed");
              })
            } else {
              res.status(400).send(errors['samePassword']);
            }
          } else {
            res.status(400).send(errors['incorrectPassword']);
          }
        })
      } else {
        res.status(400).send(errors['passwordsDontMatch']);
      }
    } else {
      res.status(400).send(errors['missingFields']);
    }
  } else {
    res.status(200).send(errors['notLoggedIn']);
  }
})
app.get("/admin", function(req, res) {
  if (req.session.loggedin == true) {
    if(req.session.group < 2) { //Check if user is admin or higher
      var revision = require('child_process').execSync('git rev-parse HEAD').toString().trim();
      var branch = require('child_process').execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
      var commit = require('child_process').execSync('git rev-list --all --count').toString().trim();
      require('child_process').execSync('git fetch');
      var behind = parseInt(require('child_process').execSync('git rev-list --count HEAD..@{u}'));
      res.status(200).render('admin', {config: reloadConfig(), session:req.session, appTheme: req.cookies.theme, revision: revision, branch: branch, commit: commit, behind: behind, path: "admin"});
    } else {
      res.status(406).json(errors['noPermission']);
    }
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
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
      connection.query(`UPDATE accounts SET bio='${bio}', twitter='${twitter}', website=${website == "" ? null:"'"+website+"'"}, location='${location}' WHERE username='${user}'`, (err, rows) => {
        if (err) throw err;
        res.status(200).redirect("/user/"+user);
      })
    } else {
      res.status(406).json(errors['invalidUsername']);
    }
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.post("/banner/upload", (req, res) => {
  if (req.session.loggedin == false) { //Check if user is logged in
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
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
      connection.query(`UPDATE accounts SET banner='/${config['upload']['banner-path']}/${req.session.uid}.png' WHERE id='${req.session.uid}'`, function(err, rows) {
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
app.post("/user/avatar", (req, res) => {
  if (req.session.loggedin == false) { //Check if user is logged in
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
  if (req.body.payload) { //Check if file is present
    var avatarData = decodeBase64Image(req.body.payload);
    let dimensions = sizeOf(Buffer.from(avatarData.data, 'base64'));
    if (dimensions.width == 500 && dimensions.height == 500) { //Check if files are the correct size
      fs.writeFile(`./${config['upload']['avatar-path']}/${req.session.uid}.png`, avatarData.data, function(err) { 
        if(err) {
          console.log(err);
          return res.status(500).send(errors['fileWriteError']);
        }
      });
      connection.query(`UPDATE accounts SET avatar='/${config['upload']['avatar-path']}/${req.session.uid}.png' WHERE id='${req.session.uid}'`, function(err, rows) {
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
    res.send(errors['registrationsDisabled']);
  }
	let username = req.body.username;
	let password = req.body.password;
  let email = req.body.email;
  if (username && password && email) { //Check if all required information is present
    if (RegExp('^[a-zA-Z0-9_.-]*$').test(username) == true) { //Make sure that only some characters are allowed    
      connection.query('SELECT * FROM accounts WHERE LOWER(username) = ? OR email = ?', [username.toLowerCase(), email], function(err , rows) {
        if (err) throw err;
        if (rows.length > 0) { //Account already exists.  
          if (rows[0].username.toLowerCase() == username.toLowerCase()) { //Account with same username exists
            return res.status(406).send(errors['usernameExists']);
          }
          if (rows[0].email == email) { //Account with email exists
            return res.status(406).send(errors['emailExists']);
          }
        }
        password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password+salt
        let token = crypto.createHash('sha256').update(username+password+config['server']['salt']).digest('base64'); //User Token
        var ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); //Get IP Address
        let api_key = crypto.randomBytes(32).toString('hex').substring(0,20); //Generate API Key
        if (config['settings']['invites'] == 'on') { //Check if invites are enabled
          let invite = req.body.invite;
          connection.query(`SELECT * FROM invites WHERE invite = '${invite}'`, (err, rows) => {
            if (err) throw err
            if (rows.length == 0) { //Invite doesn't exist
              return res.status(406).send(errors['invalidInvite']);
            } else if (rows[0].maxUses <= rows[0].uses) { //Invite has no more uses left
              res.status(406).send(errors['invalidInvite']);
            } else { //Invite exists and has uses left
              let invBy = rows[0].creator; //Sets invited by to ID of invite creator
              connection.query(`UPDATE invites SET uses = uses + 1 WHERE invite = '${invite}'`, (err, rows) => {
                if (err) throw err
              })
              connection.query(`INSERT INTO accounts VALUES (NULL, '${username}', '${email}', '${password}', '${token}', ${config['groups']['3']['id']}, '${invite}', ${invBy}, ${Date.now()}, "${ip}", NULL, '/images/default.png', NULL, NULL, NULL, NULL, ${config['groups']['3']['invites']}, 0, NULL, NULL, NULL, NULL, '${api_key}')`, (err, rows) => {
                if (err) throw err
              })
              req.session.toast = ["#6272a4","Account created"];
              return res.status(201).redirect('login');
            }
          })
        } else { //An invite is not required. 
          connection.query(`INSERT INTO accounts VALUES (NULL, '${username}', '${email}', '${password}', '${token}', ${config['groups']['3']['id']}, NULL, NULL, ${Date.now()}, "${ip}", NULL, '/images/default.png', NULL, NULL, NULL, NULL, ${config['groups']['3']['invites']}, 0, NULL, NULL, NULL, NULL, '${api_key}')`, (err, rows) => {
            if (err) throw err
          })
          req.session.toast = ["#6272a4","Account created"];
          return res.status(201).redirect('login');
        }
      }); 
    } else {
      return res.status(406).send(errors['invalidUsername']);
    }
  } else {
    return res.status(417).send(errors['unfilledFields']);
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
          if(req.body.remember) {
            req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
          }
          res.status(200).redirect('home');
        } else {
          return res.status(406).send(errors['invalidLogin']);
        }			
      });
      } else {
        return res.status(417).send(errors['loginInfoMissing']);
      }
    } else {
      return res.status(406).send(errors['invalidUsername']);
    }
});
app.get('/auth/discord', async function(req, res) {
  if(config.settings['discord-login'] == 'on') {
    let code = url.parse(req.url, true).query.code; //Get the code from the query string
    if(code) { //If there is a code
      var body = { //Create the body for the request
        'client_id': config.discord.discord_client_id,
        'client_secret': config.discord.discord_client_secret,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': config.discord.discord_login_redirect_uri,
      }
      var auth = await fetch("https://discord.com/api/v10/oauth2/token", { //Request to authorize using the code given
          method: 'POST',
          body: new URLSearchParams(Object.entries(body)).toString(),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      }).catch(err => {
        console.log(err);
      });
      var authResponse = await auth.json();
      if(authResponse.access_token) { //If the request was successful
        var user = await fetch("https://discord.com/api/v10/users/@me", { //Request to get the user's information
          method: 'GET',
          headers: {'Authorization': `Bearer ${authResponse['access_token']}`}
        });
        var user = await user.json(); //User's information
        if(user.id) {
          //res.status(200).json(user);
          connection.query(`SELECT * FROM accounts WHERE discord_id=${user.id}`, (err, rows) => {
            if(err) {
              console.log(err);
            }
            if(rows.length > 0) {
              req.session.loggedin = true;
              req.session.username = rows[0].username;
              req.session.group = rows[0].group;
              req.session.uid = rows[0].id;
              req.session.toast = ["#6272a4","Successfully signed in"];
              res.status(200).redirect('/home');
            } else {
              res.status(200).json(errors['discordInvalid']);
            }
          })
        } else {
          res.status(400).json(user);
        }
      } else { //If the request was unsuccessful
        res.status(400).json(authResponse);
      }
    } else { //If there is no code
      res.status(400).json({'error': 'No code'});
    }
  } else {
    res.status(400).json(errors['signInMethodDisabled']);
  }
});
//Upload file
app.post('/upload', upload.any('uploads'), function(req, res) {
  if (req.session.loggedin == false) { //Check if user is logged in
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
  if (req.files.length == 0) { //Check if files are present
    return res.status(400).send(errors['missingFiles']);
  }
  let files = req.files;
  returnFiles = new Array();
  files.forEach(file => {
    let hash = md5File.sync(file.path); //Get MD5 hash of file
    let delete_key = crypto.randomBytes(32).toString('hex').substring(0,40); //Generate a random delete key
    connection.query(`INSERT INTO files VALUES ('${hash.substring(0,8)}', '${file.originalname.substring(0,64)}', '${file.filename}', ${req.session.uid}, ${Date.now()}, '${hash}', ${file.size}, '${file.mimetype}', '${delete_key}')`, function(err, rows) {
      if (err) throw err;
    });
    returnFiles.push({"filename":file.originalname, path:`/files/${file.filename}`});
  });
  return res.status(200).json(returnFiles);

});
app.post('/paste', body("content").escape(), body("title").optional({checkFalsy: true}).trim().escape(), body("syntax").optional({checkFalsy: true}).trim().escape(), body("password").optional({checkFalsy: true}).trim().escape(),function(req, res) {
  if (req.session.loggedin == true) { //Check if user is logged in
    let title = req.body.title;
    let content = req.body.content;
    let burn = req.body.burn;
    if(burn == 'on') {
      burn = 1;
    } else {
      burn = 0;
    }
    let syntax = req.body.syntax;
    let password = req.body.password;
    if (password) {
      password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password
    } else {
      password = null;
    }
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
    let delete_key = crypto.randomBytes(32).toString('hex').substring(0,40); //Generate a random delete key
    connection.query(`INSERT INTO pastes VALUES ('${id}', ${req.session.uid}, '${title}', '${content}', ${burn == 1 ? 1 : 0}, ${!syntax ? null : "'"+syntax+"'"}, ${Date.now()}, ${password == null ? null : "'"+password+"'"}, "${delete_key}")`, function(err, rows) {
      if (err) throw err;
      res.status(200).json({"url":"/pastes/"+id});
    });
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).json({"error":errors['notLoggedIn']});
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
      if(req.session.group > 2) {
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
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
})
app.post('/admin/update', //Santizing input just in case. 
body('name').not().isEmpty().trim().escape(), 
body('description').not().isEmpty().trim().escape(), 
body('registrations').optional({checkFalsy: true}).escape(),
body('invites').optional({checkFalsy: true}).escape(),
body('discordLogin').optional({checkFalsy: true}).escape(),
body('bannerSize').not().isEmpty().isNumeric().default(config['upload']['banner-size']),
body('avatarSize').not().isEmpty().isNumeric().default(config['upload']['avatar-size']),
body('maxFileSize').not().isEmpty().isNumeric().default(config['upload']['max-file-size']),
body('bannedMimes.*').optional({checkFalsy: true}).trim(),
function(req, res) {
  if (req.session.loggedin == true) { //Check if user is logged in
    if(req.session.group > 2) {
      res.status(406).json({"err": errors['noPermission']});
      return;
    }
    let name = req.body.name;
    let description = req.body.description;
    let registrations = req.body.registrations;
    let invites = req.body.invites;
    let discordLogin = req.body.discordLogin;
    let bannerSize = req.body.bannerSize;
    let avatarSize = req.body.avatarSize;
    let maxFileSize = req.body.maxFileSize;
    let bannedMimes = [];
    if (req.body.bannedMimes) {
      bannedMimes = req.body.bannedMimes;
    }
    if(!registrations) {
      registrations = "off";
    }
    if(!invites) {
      invites = "off";
    }
    if(!discordLogin) {
      discordLogin = "off";
    }
    config['settings']['name'] = name;
    config['settings']['description'] = description;
    config['settings']['registrations'] = registrations;
    config['settings']['invites'] = invites;
    config['settings']['discord-login'] = discordLogin;
    config['upload']['banner-size'] = bannerSize;
    config['upload']['avatar-size'] = avatarSize;
    config['upload']['max-file-size'] = maxFileSize;
    config['upload']['banned-mimes'] = bannedMimes;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2), function (err) {
      if (err) throw err;
      res.status(200).json({"success":true});
    });
  } else {
    req.session.toast = ["#6272a4",errors['notLoggedIn']];
    res.status(200).render('login', {config: reloadConfig(), session:req.session, appTheme  : req.cookies.theme});
  }
});
//Generate sharex config with given api key
app.get("/api/config/sharex", function(req, res) {
  res.status(200).json(
    {
      "Version": "14.1.0",
      "Name": "SenBox File Upload",
      "DestinationType": "ImageUploader, FileUploader",
      "RequestMethod": "POST",
      "RequestURL": req.headers.host+"/api/upload",
      "Body": "MultipartFormData",
      "Arguments": {
        "api_key": req.query.api_key
      },
      "FileFormName": "file",
      "URL": "{json:url}",
      "DeletionURL": "{json:delete_url}",
      "ErrorMessage": "{json:error}"
    }
  );
});
//Upload file to server
app.post("/api/upload", upload.any('uploads'), body("api_key").escape(), (req, res) => {
  console.log(req.body.api_key);
  if(req.body.api_key) {
    connection.query(`SELECT * FROM accounts WHERE api_key='${req.body.api_key}'`, (err, rows) => {
      if (err) throw err;
      if (rows.length > 0) {
        if (req.files.length > 0) {
          console.log(req.files);
          let hash = md5File.sync(req.files[0].path); //Get MD5 hash of file  THIS CRASHES THE FUCKING CODE.
          let delete_key = crypto.randomBytes(32).toString('hex').substring(0,40); //Generate a random delete key
          connection.query(`INSERT INTO files VALUES ('${hash.substring(0,8)}', '${req.files[0].originalname.substring(0,64)}', '${req.files[0].filename}', ${rows[0].id}, ${Date.now()}, '${hash}', ${req.files[0].size}, '${req.files[0].mimetype}', '${delete_key}')`, function(err, rows) {
            if (err) throw err;
            return res.status(200).json({"filename": req.files[0].originalname, "url": `${req.protocol}://${req.headers.host}/files/${req.files[0].filename}`, "delete_key": delete_key, "delete_url": `${req.headers.host}/api/delete?key=${delete_key}`});
          });
        } else {
          return res.status(400).json(errors['missingFiles']);
        }
      } else {
        return res.status(400).json(errors['invalidAPIKey']);
      }
    })
  } else {
    return res.status(400).send(errors['invalidAPIKey']);
  }
});
app.post('/api/paste', body("content").escape(), body("api_key").escape(), body("title").optional({checkFalsy: true}).trim().escape(), body("syntax").optional({checkFalsy: true}).trim().escape(), body("password").optional({checkFalsy: true}).trim().escape(), function(req, res) {
  console.log(req.body);
  if(req.body.api_key) {
    connection.query(`SELECT * FROM accounts WHERE api_key='${req.body.api_key}'`, (err, rows) => { 
      if (err) throw err;
      if (rows.length > 0) {
        let title = req.body.title;
        let content = req.body.content;
        let burn = 0;
        if(req.body.burn == 'on') {
          burn = 1;
        }
        let syntax = req.body.syntax;
        let password = null;
        if (req.body.password) {
          password = crypto.createHash('sha256').update(password+config['server']['salt']).digest('base64'); //SHA256 hash of password
        }
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
        let id = crypto.createHash('sha256').update(title+content+rows[0].id+Date.now()).digest('base64').substring(1,10).replace(r, ""); //Generate id based on title, content, user, and time
        let delete_key = crypto.randomBytes(32).toString('hex').substring(0,40); //Generate a random delete key
        connection.query(`INSERT INTO pastes VALUES ('${id}', ${rows[0].id}, '${title}', '${content}', ${burn == 1 ? 1 : 0}, ${!syntax ? null : "'"+syntax+"'"}, ${Date.now()}, ${password == null ? null : "'"+password+"'"}, "${delete_key}")`, function(err, rows) {
          if (err) throw err;
          res.status(200).json({"id":id, "url":`${req.protocol}://${req.headers.host}/pastes/${id}`, "delete_key": delete_key, "delete_url": `${req.protocol}://${req.headers.host}/api/paste/delete?${delete_key}`});
        });
      } else {
        return res.status(400).json(errors['invalidAPIKey']);
      }
    })
  } else {
    return res.status(400).send(errors['invalidAPIKey']);
  }
})
//Delete file from server using delete key
app.post("/api/delete", function(req, res) {
  if(req.query.key) {
    connection.query(`SELECT * FROM files WHERE delete_key='${req.query.key}'`, function(err, rows){
      if (err) throw err;
      if (rows[0].delete_key == req.query.key) {
        fs.unlinkSync(`./files/${rows[0].name}`);
        connection.query(`DELETE FROM files WHERE delete_key='${req.query.key}'`, function(err, rows){
          if (err) throw err;
          res.status(200).json({"success":true});
        });
      } else {
        res.status(406).json({"err": errors['invalidDeleteKey']});
      }
    });
  } else {
    res.status(406).json({"err": errors['invalidDeleteKey']});
  }
});
app.post("/api/paste/delete", function(req, res) {
  if(req.query.key) {
    connection.query(`SELECT * FROM pastes WHERE delete_key='${req.query.key}'`, function(err, rows){
      if (err) throw err;
      if (rows[0].delete_key == req.query.key) {
        connection.query(`DELETE FROM pastes WHERE delete_key='${req.query.key}'`, function(err, rows){
          if (err) throw err;
          res.status(200).json({"success":true});
        });
      } else {
        res.status(406).json({"err": errors['invalidDeleteKey']});
      }
    });
  } else {
    res.status(406).json({"err": errors['invalidDeleteKey']});
  }
});
app.listen(config['server']['port'], () => {
  console.log(`App started on port ${config['server']['port']}`)
})
