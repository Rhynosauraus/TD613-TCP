/**
 * 50 MB Marrowline ingress: each individual browser->Vercel request remains
 * below 3.7 MB, then forwards its bytes to a Google resumable Files API URL.
 * No local files or server-side conversation archive are created.
 * Google may retain uploaded files for 48h; deletion by a web UI is not
 * equivalent to wiping copies at the provider.
 */
import crypto from 'node:crypto';

export const MARROWLINE_LARGE_ATTACHMENT_LIMITS = Object.freeze({
  count: 20, totalBytes: 50_000_000, singleFileBytes: 25_000_000,
  singlePhotoBytes: 25_000_000, chunkBytes: 2_250_000
});
const FILE_MIMES = new Set(['text/plain','text/markdown','text/csv','application/json','application/pdf']);
const PHOTO_MIMES = new Set(['image/jpeg','image/jpg','image/png','image/webp','image/avif','image/heic','image/heif','image/x-heic','image/x-heif','image/gif']);
const sessions = new Map();
const safe = s => String(s ?? '').trim();
const now = () => Date.now();
const key = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('provider-key-unavailable');
  return crypto.createHash('sha256').update('td613.marrowline.files.v1\0').update(process.env.GEMINI_API_KEY).digest();
};
const encode = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const decode = x => JSON.parse(Buffer.from(x,'base64url').toString('utf8'));
const hmac = value => crypto.createHmac('sha256', key()).update(value).digest('base64url');
const canonical = value => JSON.stringify(value);
function encrypt(value) {
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const bytes=Buffer.concat([cipher.update(canonical(value),'utf8'),cipher.final()]);
  return [iv.toString('base64url'),bytes.toString('base64url'),cipher.getAuthTag().toString('base64url')].join('.');
}
function decrypt(ticket) {
  const parts=safe(ticket).split('.');
  if(parts.length!==3 || parts.some(x=>!x || x.length>3000)) throw new Error('invalid-upload-ticket');
  try {
    const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(parts[0],'base64url'));
    decipher.setAuthTag(Buffer.from(parts[2],'base64url'));
    const json=Buffer.concat([decipher.update(Buffer.from(parts[1],'base64url')),decipher.final()]).toString('utf8');
    const claims=JSON.parse(json);
    if(claims.exp<now() || claims.exp>now()+60*60*1000) throw new Error('expired-upload-ticket');
    const url=new URL(claims.url);
    if(url.protocol!=='https:' || url.hostname!=='generativelanguage.googleapis.com' || !url.pathname.startsWith('/upload/')) throw new Error('invalid-provider-upload-url');
    return claims;
  } catch {throw new Error('invalid-or-expired-upload-ticket');}
}
function validateDescriptor(raw) {
  if (!raw || typeof raw!=='object') throw new Error('invalid-attachment');
  const id=safe(raw.id),name=safe(raw.name),kind=safe(raw.kind),mime_type=safe(raw.mime_type).toLowerCase(),size_bytes=Number(raw.size_bytes);
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(id) || !name || name.length>240 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('invalid-attachment-identity');
  if(!(kind==='file'?FILE_MIMES:kind==='photo'?PHOTO_MIMES:new Set()).has(mime_type)) throw new Error('unsupported-attachment-type');
  const max=kind==='photo'?MARROWLINE_LARGE_ATTACHMENT_LIMITS.singlePhotoBytes:MARROWLINE_LARGE_ATTACHMENT_LIMITS.singleFileBytes;
  if(!Number.isSafeInteger(size_bytes)||size_bytes<1||size_bytes>max) throw new Error('invalid-attachment-size');
  return { id,name,kind,mime_type,size_bytes };
}
function proofFor(descriptor,file_uri,sha256=null) {
  const record={...descriptor,file_uri,sha256,exp:now()+2*60*60*1000};
  const bytes=encode(record);
  return bytes+'.'+hmac(bytes);
}
export function verifyMarrowlineUploadProof(raw) {
  const descriptor=validateDescriptor(raw);
  const parts=safe(raw.upload_proof).split('.');
  if(parts.length!==2 || parts[0].length>2000 || parts[1].length!==43) throw new Error('invalid-upload-proof');
  const expected=hmac(parts[0]);
  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts[1]))) throw new Error('invalid-upload-proof');
  let record;
  try {record=decode(parts[0]);}catch{throw new Error('invalid-upload-proof');}
  if(record.exp<now() || record.exp>now()+3*60*60*1000) throw new Error('expired-upload-proof');
  if(!/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/files\/[A-Za-z0-9_-]+$/.test(record.file_uri)) throw new Error('invalid-file-uri');
  for(const [name,value] of Object.entries(descriptor)) if(record[name]!==value) throw new Error('upload-proof-metadata-mismatch');
  if(record.file_uri!==raw.file_uri) throw new Error('upload-proof-uri-mismatch');
  return { ...descriptor,file_uri:record.file_uri,source_digest:record.sha256||null };
}
function send(res,status,body) {
  res.statusCode=status;
  res.setHeader('Cache-Control','no-store,max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(body));
}
function rateGate(ip) {
  const keyValue=safe(ip).slice(0,100)||'unknown',entry=sessions.get(keyValue);
  if(!entry || now()>entry.reset) { sessions.set(keyValue,{count:1,reset:now()+3600000});return true; }
  entry.count+=1;
  return entry.count<=80;
}
function originOk(req) {
  const origin=req.headers?.origin;
  if(!origin) return true;
  try {
    const host=safe(req.headers['x-forwarded-host']||req.headers.host);
    return new URL(origin).host===host;
  }catch{return false;}
}
function validatedBody(req) {
  const body=(typeof req.body==='string'||Buffer.isBuffer(req.body))?JSON.parse(String(req.body)):req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)) throw new Error('invalid-upload-body');
  return body;
}
async function providerResponse(response) {
  const text=await response.text();
  try {return text?JSON.parse(text):{};}catch{return {};}
}
export default async function marrowlineAttachmentUploadHandler(req,res) {
  if(req.method!=='POST') return send(res,405,{ok:false,error:'method-not-allowed'});
  if(!originOk(req)) return send(res,403,{ok:false,error:'same-origin-required'});
  if(!process.env.GEMINI_API_KEY) return send(res,503,{ok:false,error:'provider-key-unavailable'});
  try {
    const body=validatedBody(req);
    if(Buffer.byteLength(JSON.stringify(body))>3_700_000) throw new Error('upload-chunk-too-large-for-vercel');
    if(body.action==='start'){
      const item=validateDescriptor(body);
      const ip=safe(req.headers['x-forwarded-for']||req.headers['x-real-ip']).split(',')[0];
      if(!rateGate(ip)) return send(res,429,{ok:false,error:'upload-start-rate-limited'});
      const response=await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files',{
        method:'POST',signal:AbortSignal.timeout(45000),
        headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start','X-Goog-Upload-Header-Content-Length':String(item.size_bytes),'X-Goog-Upload-Header-Content-Type':item.mime_type,'Content-Type':'application/json'},
        body:JSON.stringify({file:{display_name:item.name}})
      });
      if(!response.ok) return send(res,502,{ok:false,error:'provider-upload-start-failed',providerStatus:response.status});
      const url=safe(response.headers.get('x-goog-upload-url'));
      const parsed=new URL(url);
      if(parsed.protocol!=='https:'||parsed.hostname!=='generativelanguage.googleapis.com'||!parsed.pathname.startsWith('/upload/')) throw new Error('provider-upload-url-held');
      return send(res,200,{ok:true,ticket:encrypt({...item,url,exp:now()+45*60*1000}),chunkBytes:MARROWLINE_LARGE_ATTACHMENT_LIMITS.chunkBytes});
    }
    if(body.action!=='chunk') throw new Error('unknown-upload-operation');
    const session=decrypt(body.ticket),offset=Number(body.offset);
    const encoded=safe(body.data_base64);
    if(!encoded||encoded.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('invalid-upload-chunk-base64');
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.length<1||bytes.length>MARROWLINE_LARGE_ATTACHMENT_LIMITS.chunkBytes) throw new Error('invalid-upload-chunk-size');
    if(!Number.isSafeInteger(offset)||offset<0||offset+bytes.length>session.size_bytes) throw new Error('invalid-upload-offset');
    const final=offset+bytes.length===session.size_bytes;
    if(Boolean(body.finalize)!==final) throw new Error('upload-finalize-mismatch');
    const response=await fetch(session.url,{
      method:'POST',signal:AbortSignal.timeout(55000),
      headers:{'Content-Type':'application/octet-stream','X-Goog-Upload-Offset':String(offset),'X-Goog-Upload-Command':final?'upload, finalize':'upload'},
      body:bytes
    });
    if(!response.ok) return send(res,502,{ok:false,error:'provider-upload-chunk-failed',providerStatus:response.status});
    if(!final) return send(res,200,{ok:true,receivedBytes:offset+bytes.length,final:false});
    const result=await providerResponse(response),file=result.file||result;
    const file_uri=safe(file.uri);
    if(!/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/files\/[A-Za-z0-9_-]+$/.test(file_uri)) throw new Error('provider-file-uri-unverified');
    const sha256=typeof file.sha256Hash==='string'&&file.sha256Hash
      ?Buffer.from(file.sha256Hash,'base64').toString('hex'):null;
    const descriptor={id:session.id,name:session.name,kind:session.kind,mime_type:session.mime_type,size_bytes:session.size_bytes};
    return send(res,200,{ok:true,final:true,file_uri,upload_proof:proofFor(descriptor,file_uri,sha256)});
  }catch(error){
    const code=error?.name==='TimeoutError'?'provider-upload-timeout':safe(error?.message||'upload-held');
    return send(res,400,{ok:false,error:code.slice(0,120)});
  }
}
