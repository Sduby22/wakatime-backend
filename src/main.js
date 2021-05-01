import express from 'express'
import expressJwt from 'express-jwt'
import jwt from 'jsonwebtoken'
import Sqlite from './sql.js'
import crypto from 'crypto'
import { getStat } from './leaderboard_update.js'

var app = express()
var db = new Sqlite()
const secret = 'dijawo292093iapo'
const passwdReg = /[a-zA-Z0-9._!@#$%^&*]+/
db.connect('../data/data.sqlite3')
db.exec('create table if not exists USERS(ID integer primary key autoincrement, NAME text not null, PASS text not null, WAKA_ID text, NICKNAME text, INVALID byte)')

app.use(express.json())

function sign(obj) {
  return jwt.sign(obj, secret)
}

function err_msg(msg) {
  return {
    success: 0,
    msg
  }
}
 
function getmd5(string) {
  const salt = 'sadasdd2'
  var md5 = crypto.createHash('md5')
  return md5.update(string + salt).digest('hex')
}

const ejwt = expressJwt({
  secret,
  algorithms: ['HS256']
})

/* app.use(expressJwt({
  secret,
  algorithms: ['HS256']
}).unless(['/api/login', '/api/signup'])) */

app.use(function(err, _req, res, _next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('invalid token...');
  }
});

app.post('/api/register', (req, res) => {
  let body = req.body
  let user = body.username
  let pass = getmd5(body.password)
  db.get(`select NAME, PASS from USERS WHERE NAME=?`, [user])
    .then(sql => {
      if (!sql) {
        db.run(`insert into USERS (NAME, PASS) VALUES (?, ?)`, [user, pass])
          .then(() => {
            db.run(`insert into USERS_WAKA (NAME) VALUES (?)`, [user])
            res.send({
              success: 1,
              user: {
                user: user,
                jwt: sign({user})
              }
            })})
          .catch(e => {
            res.status(400).send(err_msg(e))
          })
      }
      else
        res.status(400).send(err_msg(`user already exists!`))
    })
})

app.post('/api/login', (req, res) => {
  let body = req.body
  let user = body.username
  let pass = getmd5(body.password)
  db.get(`select NAME, PASS from USERS WHERE NAME=?`, [user])
    .then(e => {
      console.log(e.PASS, ' ', pass)
      if (e && e.PASS == pass) {
        res.send({
          success: 1,
          user: {
            user: user,
            jwt: sign({user})
          }
        })
      } else {
        res.status(400).send(err_msg('Incorect username or password'))
      }
    })
})

app.post('/api/edit_profile', ejwt, (req, res) => {
  let user = req.user
  let profile = req.body
  if(user.user !== profile.NAME) {
    res.status(401).send('Not Authorized')
  } else {
    db.run(`update USERS set NICKNAME = ?, WAKA_ID = ?, INVALID=0 where NAME = ?`
           ,[profile.NICKNAME, profile.WAKA_ID, profile.NAME])
      .then(()=>{
        db.run(`update USERS_WAKA set NICKNAME=? where NAME=?`, [profile.NICKNAME, profile.NAME])
      })
      .then(()=>{
        res.send({
            success: 1
        })
      })
      .then(() => {
        getStat(user.user, profile.WAKA_ID)
      })
      .catch(e=>{
        res.status(400).send(err_msg(e))
      })
  }
})

app.get('/api/leaderboards', ejwt, (_req, res) => {
  let leaderboards = null
  db.all(`select * from USERS_WAKA where WAKA_ID is not null`).then(
    e => {
      leaderboards = e
      res.send(leaderboards)
    }
  ).catch(
    e => res.status(400).send(e)
  )
})

app.get('/api/profile', ejwt, (req, res) => {
  let user = req.user
  db.get(`select NAME, NICKNAME, WAKA_ID from USERS WHERE NAME=?`, [user.user])
    .then(e => {
      res.send(e)
    })
})

app.listen(3000, () => {})
