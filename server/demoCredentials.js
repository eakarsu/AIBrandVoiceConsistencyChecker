'use strict';
const pairs=[['DEMO_EMAIL','DEMO_PASSWORD'],['SEED_ADMIN_EMAIL','SEED_ADMIN_PASSWORD'],['ADMIN_EMAIL','ADMIN_PASSWORD'],['DEFAULT_EMAIL','DEFAULT_PASSWORD']];
function resolveDemoCredentials(env=process.env){const keys=pairs.find(([email,password])=>env[email]&&env[password]);if(!keys)throw Error('Local demo credentials are incomplete. Existing accounts were preserved.');const email=String(env[keys[0]]).trim().toLowerCase(),password=String(env[keys[1]]);if(!email.includes('@')||password.length<12||password.length>1024)throw Error('Configure a valid local demo email and 12–1024 character password. Existing accounts were preserved.');return{email,password};}
module.exports={resolveDemoCredentials};
