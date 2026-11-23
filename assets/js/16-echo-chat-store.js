/* Echo Chamber SC-1: local-first store and backup validators. */
(function(){'use strict';
const prefix='damaged-dollhouse-chat-';
const KEYS={categories:prefix+'categories-v1',channels:prefix+'channels-v1',messages:prefix+'messages-v1',drafts:prefix+'drafts-v1',tombstones:prefix+'tombstones-v1',reads:prefix+'reads-v1'};
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(x,max=100000)=>typeof x==='string'&&x.length<=max;
const id=x=>str(x,150)&&!!x;
function validate(key,raw){if(raw===null)return;let data;try{data=JSON.parse(raw)}catch(_){throw Error('Invalid JSON in '+key)}
 if(!Array.isArray(data)||data.length>50000)throw Error('Invalid Echo Chamber collection: '+key);
 const ids=new Set();for(const v of data){if(!isObj(v)||!id(v.id)||ids.has(v.id))throw Error('Invalid or duplicate Echo Chamber ID in '+key);ids.add(v.id);if(v.deletedAt!==undefined&&v.deletedAt!==null&&(!str(v.deletedAt,40)||!Number.isFinite(Date.parse(v.deletedAt))))throw Error('Invalid chat deletion timestamp');
 if(key===KEYS.categories){if(!str(v.name,100)||!v.name.trim()||!Number.isFinite(v.order)||typeof v.archived!=='boolean')throw Error('Invalid chat category')}
 if(key===KEYS.channels){if(!str(v.name,100)||!v.name.trim()||!id(v.categoryId)||!Number.isFinite(v.order)||typeof v.archived!=='boolean')throw Error('Invalid chat channel')}
 if(key===KEYS.messages){if(v.editHistory!==undefined&&(!Array.isArray(v.editHistory)||v.editHistory.length>100||v.editHistory.some(h=>!isObj(h)||!str(h.body,20000)||!str(h.at,40))))throw Error('Invalid chat edit history');if(v.replyTo!==undefined&&v.replyTo!==null&&!id(v.replyTo))throw Error('Invalid reply target');if(v.pinned!==undefined&&typeof v.pinned!=='boolean')throw Error('Invalid pin');if(!id(v.channelId)||!str(v.body,20000)||!v.body.trim()||!str(v.createdAt,40)||!isObj(v.author)||!['shared','profiles'].includes(v.author.type)||!Array.isArray(v.author.profileIds)||v.author.profileIds.some(x=>!id(x))||new Set(v.author.profileIds).size!==v.author.profileIds.length||(v.author.type==='shared'&&v.author.profileIds.length!==0)||(v.author.type==='profiles'&&v.author.profileIds.length===0))throw Error('Invalid chat message')}
 if(key===KEYS.drafts){if(!id(v.channelId)||!str(v.body,20000)||!Array.isArray(v.authorIds)||v.authorIds.some(x=>!id(x))||new Set(v.authorIds).size!==v.authorIds.length)throw Error('Invalid chat draft')}
 if(key===KEYS.reads){if(!id(v.profileId)||!id(v.conversationId)||!str(v.lastReadAt,40)||!Number.isFinite(Date.parse(v.lastReadAt)))throw Error('Invalid chat read marker')}
 if(key===KEYS.tombstones){if(!id(v.messageId)||!str(v.purgedAt,40))throw Error('Invalid chat deletion marker')}
 }}
function load(type){const key=KEYS[type];if(!key)throw Error('Unknown chat collection');const raw=localStorage.getItem(key);validate(key,raw);return raw===null?[]:JSON.parse(raw)}
function save(type,data){const key=KEYS[type],raw=JSON.stringify(data);validate(key,raw);const old=localStorage.getItem(key);try{localStorage.setItem(key,raw);if(localStorage.getItem(key)!==raw)throw Error('Save verification failed')}catch(e){try{if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old)}catch(_){}throw e}}
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'sc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
function init(){if(localStorage.getItem(KEYS.categories)===null)save('categories',[{id:'echo-main',name:'Main House',order:0,archived:false,createdAt:new Date().toISOString()}]);if(localStorage.getItem(KEYS.channels)===null)save('channels',[{id:'echo-general',categoryId:'echo-main',name:'general',description:'A place for everyone ♡',order:0,archived:false,createdAt:new Date().toISOString()}]);}
window.DollhouseEchoStore=Object.freeze({KEYS,validate,load,save,uid,init});
})();
