module.exports = function(app, passport, db, ObjectId) {
  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get('/', function(req, res) {
    res.render('index.ejs');
  });


  // PROFILE SECTION =========================

  app.get('/profile', isLoggedIn, function(req, res) {
    var uId = ObjectId(req.session.passport.user) 
    var uName
    db.collection('users').find({
      "_id": uId
    }).toArray((err, result) => {
      if (err) return console.log(err)
      uName = result[0].local.username 
      db.collection('messages').find({
        'username': result[0].local.username
      }).toArray((err, messages) => {
        if (err) return console.log(err)
        res.render('profile.ejs', {
          user: req.user,
          messages: messages,
          bio: req.bio,
          title:messages.title
        })
      })
    });
  });


  app.get('/profile/:username', isLoggedIn, function(req, res) {
    db.collection('users').find({
      "username": req.params.username
    }).toArray((err, result) => {

      if (err) return console.log(err)

      db.collection('messages').find({
        username: req.body.local.username
      }).toArray((err, messages) => {
        if (err) return console.log(err) 
        res.render('profile.ejs', {
          user: req.user,
          messages: messages,
          title:req.title,
          bio: req.bio,
          time: req.time
        })
      })
    });
  });


  // LOGOUT ==============================
  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  //Maps ROUTES ================================================================

  app.get('/maps', isLoggedIn, function(req, res) {
    var uId = ObjectId(req.session.passport.user)

    db.collection('messages').find({ 
      location: {
        $near: {
          $maxDistance: 1000,
          $geometry: {
            type: "Point",
            // Replace hardcoded coordinates for actual req.location
            //get user id of current user and submit their coordinates to the dom
            //????? should the coordinates her be of the user or the coordinates that are being retrieved
            coordinates: [42.3582, -71.0590]
          }
        }
      }
    }).toArray((err, messages) => { 
      if (err) return console.log(err);
      const mapResults = {
        "type": "FeatureCollection",
        "features": []
      };
      messages.forEach(md => {
        mapResults.features.push({
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [ md.location.coordinates[0], md.location.coordinates[1] ]
          },
          "properties": {
            "message": md.quote,
            "who"   : md.username,
            "title" : md.title,
            "id"    : md._id
          }
        });
      })
      res.render('maps.ejs', {
        features: mapResults.features,
        geometry: mapResults.geometry,
        mapResults: mapResults
      })

      res.end();

    })
  }) 

  app.get('/mapsdata', isLoggedIn, function(req, res) {
    var uId = ObjectId(req.session.passport.user)

    db.collection('messages').find({ 
      location: {
        $near: {
          $maxDistance: 1000,
          $geometry: {
            type: "Point",
            // Replace hardcoded coordinates for actual req.location
            //get user id of current user and submit their coordinates to the dom
            //????? should the coordinates her be of the user or the coordinates that are being retrieved
            coordinates: [42.3582, -71.0590]
          }
        }
      }
    }).toArray((err, messages) => {
      if (err) return console.log(err);

      const mapResults = {
        "type": "FeatureCollection",
        "features": []
      };
      messages.forEach(md => {
        mapResults.features.push({
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [md.location.coordinates[1], md.location.coordinates[0]]
          },
          "properties": {
            "message": md.quote,
            "id"     : md._id,
            "who"   : md.username
          }
        });
      })
      res.json(mapResults)
      res.end();

    })
    // })
  });


//IMAGE CODE ==================================



  // Posting routes ===============================================================

  app.post('/messages', isLoggedIn, (req, res) => {
    let location = JSON.parse(req.body.locate);
    var uId = ObjectId(req.session.passport.user)
    var uName
    db.collection('users').find({
      "_id": uId
    }).toArray((err, result) => {
      if (err) return console.log(err)
      uName = result[0].local.username
      db.collection('messages').save({
        bio: req.body.bio, 
        name: req.body.name,
        quote: req.body.quote,
        title: req.body.title,
        time: ObjectId(req.body.id).getTimestamp(),
        username: uName,
        location: {
          type: "Point",
          coordinates: [location.lat, location.lon]
        },
        thumbUp: false,

      }, (err, result) => {
        if (err) return console.log(err)
        res.redirect('/profile')
      })
    })
  })

  app.put('/messages', (req, res) => {

    db.collection('messages')
      .findOneAndUpdate({

        quote: req.body.quote

      }, {
        $set: {
          isSelected: req.body.isSelected
        }
      }, {
        sort: {
          _id: -1
        },
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
  })

  app.delete('/messages', (req, res) => {
    db.collection('messages').deleteOne( { "_id" : ObjectId(req.body.id)
    }, (err, result) => {
      if (err) return res.send(500, err)
      res.send('Message deleted!')
    })
  })

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function(req, res) {
    res.render('login.ejs', {
      message: req.flash('loginMessage')
    });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile', 
    failureRedirect: '/login', 
    failureFlash: true 
  }));

  // SIGNUP =================================
  app.get('/signup', function(req, res) {
    res.render('signup.ejs', {
      message: req.flash('signupMessage')
    });
  });

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', 
    failureRedirect: '/signup',
    failureFlash: true // 
  }));

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get('/unlink/local', isLoggedIn, function(req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function(err) {
      res.redirect('/profile');
    });
  });
};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}
