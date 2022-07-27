const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()
const mongoDB = process.env['MONGODB']

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
});
const userSchema = new mongoose.Schema({
  username: {type: String,
             unique: true,
             required: true
            }
});
const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [exerciseSchema]
});

const Log = mongoose.model('Log', logSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);

mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true})

const addUser = (req, res) => {
  let user = new User({
    username: req.body.username
  });
  user.save((err,data) => {
    if (err) {
      if (err.code == 11000) {
        return res.json({"error": "username already exists"});
      } else {
        return res.json({"error": "unknown error"});
      }
    }
  })
  let log = new Log({
    _id: user._id,
    username: req.body.username,
    count: 0
  })
  log.save((err) => {
    if (err) return res.json({"error": "unknown error"});
    res.json({
      _id: user._id,
      username: user.username
    });
  })
}

const getUser = (res) => {
  User.find({}, (err,data) => {
    if (err) return res.send(err);
    res.json(data);
  })
}

const addExercise = (req, res) => {
  var date = Date.now();

  if (req.body.date) date = req.body.date;

  let exercise = new Exercise({
    description: req.body.description,
    duration: req.body.duration,
    date: date
  });
  exercise.save((err,data) => {
    if (err) return res.json(err)
  });

  Log.findOne({_id: req.params._id},(err,result) => {
    if (err) return res.json(err);
    result.count++;
    result.log.push(exercise);
    result.save((err) => {
      if (err) return res.json(err);
    });
    res.json({
      _id: result._id,
      username: result.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
  });
  });
}

const getLogs = (req,res) => {
  if (req.query.from) {
    var from = new Date(req.query.from);  
  }

  if (req.query.to) {
    var to = new Date(req.query.to)
  }

  if (req.query.limit) {
    var limit = req.query.limit
  }
  
  Log.findOne({
      _id: req.params._id
    }, (err,data) => {
      if (err) return res.send(err);

      let log = data.log
        
      if (from) {
        log = log.filter((entry) => entry.date >= from)
      }

      if (to) {
        log = log.filter((entry) => entry.date <= to)  
      }

      if (limit) {
        log = log.slice(0,limit)
      }
      
      log = log.map((entry) => {
        return {
          description: entry.description,
          duration: entry.duration,
          date: entry.date.toDateString()
        }
      })
    
      res.json({
        username: data.username,
        count: data.count,
        _id: data._id,
        log: log
      });
    })
}

app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.route('/api/users')
    .get((req,res) => getUser(res))
    .post((req,res) => addUser(req, res));

app.post('/api/users/:_id/exercises', (req,res) => {
  addExercise(req,res);    
})

app.get('/api/users/:_id/logs', (req,res) => {
  getLogs(req,res);
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})