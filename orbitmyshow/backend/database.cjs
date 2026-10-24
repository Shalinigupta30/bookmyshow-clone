const fs=require('node:fs'),path=require('node:path');const {DatabaseSync}=require('node:sqlite');
function openDatabase(file=process.env.ORBIT_DB||path.resolve(__dirname,'../data/orbit.sqlite')){
 if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true});const db=new DatabaseSync(file);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,city TEXT NOT NULL DEFAULT 'Delhi-NCR',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,item_id INTEGER NOT NULL,title TEXT NOT NULL,venue TEXT NOT NULL,show_date TEXT NOT NULL,show_time TEXT NOT NULL,seats TEXT NOT NULL,subtotal INTEGER NOT NULL,fee INTEGER NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reservations(slot TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),method TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS consent(id TEXT PRIMARY KEY,preferences TEXT NOT NULL,updated_at TEXT NOT NULL);`);return db;
}module.exports={openDatabase};
