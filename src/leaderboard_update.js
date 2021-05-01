import Sqlite from './sql.js'
import axios from 'axios'

var db = new Sqlite()
const waka_api = (waka_id) => `https://wakatime.com/api/v1/users/${waka_id}/stats/last_7_days`
db.connect('../data/data.sqlite3')
db.exec('create table if not exists USERS_WAKA(ID integer primary key autoincrement, NAME text not null, TOTAL integer, AVG integer, SYSTEMS text, LANGUAGES text, EDITORS text, WAKA_ID text, NICKNAME text)')

async function getallStat() {
  let users = await getall() 
  for (let user of users) {
    getStat(user.NAME, user.WAKA_ID)
  }
}

function setUsersWaka(name, obj) {
  if (obj)
    return db.run(`update USERS_WAKA set WAKA_ID=?, AVG=?, TOTAL=?, SYSTEMS=?,LANGUAGES=?,EDITORS=? where NAME=?`, [obj.waka_id, obj.avg, obj.total, obj.systems, obj.languages, obj.editors, name])
  else
    return db.run(`update USERS_WAKA set WAKA_ID=?, AVG=?, TOTAL=?, SYSTEMS=?,LANGUAGES=?,EDITORS=? where NAME=?`, [null,null,null,null,null,null,name])
}

async function getStat(name, id) {
  let resp = null;

  try {
    resp = await axios.get(waka_api(id))
  } catch (e) {
    if(e.response.status === 404) {
      flagInvalid(id)    
    } else {
      throw e
    }
    await setUsersWaka(name, null)
  }

  let d = resp.data.data
  let waka_id = d.user_id

  if(!d.total_seconds) {
    flagInvalid(id)
    await setUsersWaka(name, null)
    return
  }

  function sortAndGetName(arr) {
    arr.sort((a,b) => {
      return b.percent - a.percent
    })
    return arr.map(x => x.name).join(",")
  }

  let systems = sortAndGetName(d.operating_systems)
  let languages = sortAndGetName(d.languages)
  let editors = sortAndGetName(d.editors)
  let total = d.total_seconds
  let avg = d.daily_average
  
  let obj = {waka_id, avg, total, systems, languages, editors}
  await setUsersWaka(name, obj)
}

function flagInvalid(id) {
  return db.run(`update USERS set INVALID=1 where WAKA_ID=?`, [id])
}

async function getall() {
  try {
    let res = await db.all(`select NAME, WAKA_ID from USERS where WAKA_ID is not null and INVALID = 0`)
    return res
  } catch {
    console.error('getall() failed..')
    return Promise.reject([])
  }
}

setInterval(getallStat, 1000*5*60)

export {
  getStat,
}
