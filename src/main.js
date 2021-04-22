import express from 'express'
import expressJwt from 'express-jwt'
import jwt from 'jsonwebtoken'
import Sqlite from './sql.js'

var app = express()
var db = new Sqlite()
db.connect('../data/data.sqlite3')

app.use(expressJwt({
  secret: 'dijawo292093iapo',
  algorithms: ['HS256']
}).unless(['/api/login', '/api/signup']))

app.use(function(err, _req, res, _next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('invalid token...');
  }
});

app.post('/api/login', (req, res) => {
  let body = req.body
})

app.listen(3000, () => {
  db.all(`select * from test`).then((data) => {
    console.log(data)
  })
})
