const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const {freshRecordActor} = require('../lib/nativeRecordInput');
const router = express.Router();
const ALLOWED_EVENTS = ['content.analyzed','content.flagged_off_brand','content.approved','voice.drift_detected','competitor.update_detected','audit.report_generated','guideline.updated'];
const columns = "id,url,events,active,secret IS NOT NULL AND secret <> '' AS has_signing_secret,created_at,updated_at";
async function ensureTable() {
  const present = await pool.query("SELECT to_regclass('webhooks') AS table_name");
  if (!present.rows[0]?.table_name) {
    await pool.query(`CREATE TABLE IF NOT EXISTS webhooks (id SERIAL PRIMARY KEY,user_id INTEGER,url TEXT NOT NULL,events TEXT[] NOT NULL DEFAULT ARRAY['content.analyzed']::text[],secret VARCHAR(255),active BOOLEAN DEFAULT true,created_at TIMESTAMP DEFAULT NOW(),updated_at TIMESTAMP DEFAULT NOW())`);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id)');
  }
}
function validId(req,res,next) { if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({error:'Choose an actual saved webhook configuration.'}); next(); }
function fields(body) {
  const fail = message => { throw Object.assign(new Error(message),{status:400}); };
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key=>!['url','events','secret','active'].includes(key))) fail('Only the displayed webhook configuration fields can be changed.');
  if (typeof body.url !== 'string' || !body.url.trim() || body.url.length>2000) fail('Enter your actual endpoint URL.');
  let parsed;try { parsed = new URL(body.url.trim()); } catch (_) { fail('Enter a valid endpoint URL.'); }
  if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('Use an HTTP or HTTPS endpoint without embedded credentials. Enter a signing secret separately when required.');
  const incoming = body.events ?? ['content.analyzed'];
  if (!Array.isArray(incoming) || !incoming.length || incoming.length>ALLOWED_EVENTS.length || incoming.some(event=>!ALLOWED_EVENTS.includes(event))) fail('Choose at least one supported event.');
  if (body.active !== undefined && typeof body.active !== 'boolean') fail('The enabled setting must be a boolean.');
  if (body.secret !== undefined && body.secret !== null && (typeof body.secret !== 'string' || body.secret.length>255)) fail('A signing secret must be at most 255 characters.');
  return {url:body.url.trim(),events:[...new Set(incoming)],active:body.active??true,hasSecret:Object.hasOwn(body,'secret'),secret:body.secret||null};
}
function unavailable(res,error) { res.status(error.status||503).json({error:error.status?error.message:'Webhook configuration storage is unavailable. Retry the actual saved record.'}); }
router.use(auth,freshRecordActor);
router.get('/_/events',(_req,res)=>res.json({events:ALLOWED_EVENTS}));
router.get('/',async(req,res)=>{try{await ensureTable();res.json((await pool.query('SELECT '+columns+' FROM webhooks WHERE user_id=$1 ORDER BY created_at DESC,id DESC',[req.user.id])).rows);}catch(error){unavailable(res,error);}});
router.get('/:id',validId,async(req,res)=>{try{await ensureTable();const row=(await pool.query('SELECT '+columns+' FROM webhooks WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Webhook configuration not found.'});res.json(row);}catch(error){unavailable(res,error);}});
router.post('/',async(req,res)=>{try{const value=fields(req.body);await ensureTable();const row=(await pool.query('INSERT INTO webhooks(user_id,url,events,secret,active) VALUES($1,$2,$3,$4,$5) RETURNING '+columns,[req.user.id,value.url,value.events,value.secret,value.active])).rows[0];res.status(201).json(row);}catch(error){unavailable(res,error);}});
router.put('/:id',validId,async(req,res)=>{try{const value=fields(req.body);await ensureTable();const row=(await pool.query('UPDATE webhooks SET url=$3,events=$4,active=$5,secret=CASE WHEN $6 THEN $7 ELSE secret END,updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING '+columns,[req.params.id,req.user.id,value.url,value.events,value.active,value.hasSecret,value.secret])).rows[0];if(!row)return res.status(404).json({error:'Webhook configuration not found.'});res.json(row);}catch(error){unavailable(res,error);}});
router.delete('/:id',validId,async(req,res)=>{try{await ensureTable();const row=(await pool.query('DELETE FROM webhooks WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Webhook configuration not found.'});res.json({success:true,deleted:row.id});}catch(error){unavailable(res,error);}});
router.post('/:id/test',validId,async(req,res)=>{try{await ensureTable();const row=(await pool.query('SELECT id,url,events FROM webhooks WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Webhook configuration not found.'});res.json({success:true,target:row.url,events:row.events,payload:{event:'webhook.test',timestamp:new Date().toISOString(),data:{message:'Local payload preview from Brand Voice'}},note:'Local diagnostic payload only. No outgoing HTTP delivery or integration execution was performed.'});}catch(error){unavailable(res,error);}});
module.exports = router;
