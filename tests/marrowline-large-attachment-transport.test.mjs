import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import uploadHandler, { verifyMarrowlineUploadProof, MARROWLINE_LARGE_ATTACHMENT_LIMITS } from '../server/marrowline-attachment-upload.js';
import { prepareMarrowlineAttachmentWire, marrowlineUploadRequired, MARROWLINE_UPLOAD_ENDPOINT } from '../app/dome-world/marrowline-attachment-upload.js';
import { MARROWLINE_ATTACHMENT_LIMITS } from '../app/dome-world/marrowline-attachments.js';
import { MARROWLINE_ATTACHMENT_MAX_TOTAL_BYTES, MARROWLINE_ATTACHMENT_MAX_SINGLE_FILE_BYTES, normalizeMarrowlineAttachments, buildAttachmentGeminiRequest } from '../server/marrowline-attachment-quality.js';

function response(body, status=200) {
  return {ok:status>=200&&status<300,status,headers:{get:key=>key==='x-goog-upload-url'?'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=synthetic':null},
    text:async()=>JSON.stringify(body)};
}
function fakeRes() {
  return {headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=JSON.parse(body);}};
}
test('50 MB aggregate limit and per-file limits agree at client and provider boundary', () => {
  assert.equal(MARROWLINE_ATTACHMENT_LIMITS.count,20);
  assert.equal(MARROWLINE_ATTACHMENT_LIMITS.totalBytes,50_000_000);
  assert.equal(MARROWLINE_ATTACHMENT_MAX_TOTAL_BYTES,50_000_000);
  assert.equal(MARROWLINE_ATTACHMENT_MAX_SINGLE_FILE_BYTES,25_000_000);
  assert.equal(MARROWLINE_LARGE_ATTACHMENT_LIMITS.chunkBytes,2_250_000);
});
test('Gemini Files upload moves large attachment chunks around Vercel ingress and binds provider file references', async t => {
  const previousKey=process.env.GEMINI_API_KEY,previousFetch=globalThis.fetch;
  process.env.GEMINI_API_KEY='SYNTHETIC_TEST_KEY_DO_NOT_USE';
  t.after(()=>{if(previousKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previousKey;globalThis.fetch=previousFetch;});
  const upstream=[],toServer=[];
  globalThis.fetch=async(url,options)=>{
    if(url==='https://generativelanguage.googleapis.com/upload/v1beta/files'){
      return response({},200);
    }
    assert.match(url,/^https:\/\/generativelanguage\.googleapis\.com\/upload\//);
    assert.equal(options.method,'POST');
    const bytes=Buffer.from(options.body);
    upstream.push({offset:Number(options.headers['X-Goog-Upload-Offset']),bytes,command:options.headers['X-Goog-Upload-Command']});
    if(options.headers['X-Goog-Upload-Command']==='upload, finalize')
      return response({file:{uri:'https://generativelanguage.googleapis.com/v1beta/files/synthetic-file-613'}});
    return response({});
  };
  const viaMarrowline=async(url,options)=>{
    assert.equal(url,MARROWLINE_UPLOAD_ENDPOINT);
    const req={method:'POST',body:JSON.parse(options.body),headers:{host:'td613.com',origin:'https://td613.com','x-forwarded-for':'203.0.113.10'}};
    assert.ok(Buffer.byteLength(options.body)<3_700_000,'every upload body must fit below the Vercel ingress guard');
    toServer.push({action:req.body.action,offset:req.body.offset});
    const res=fakeRes();
    await uploadHandler(req,res);
    return {ok:res.statusCode===200,status:res.statusCode,json:async()=>res.body};
  };
  const bytes=Buffer.alloc(2_350_001,0x42);
  const item={schema:'td613.marrowline.attachment/v0.1',id:'att_large_test',name:'operator-notes.pdf',kind:'file',
    mime_type:'application/pdf',size_bytes:bytes.length,data_base64:bytes.toString('base64')};
  assert.equal(marrowlineUploadRequired([item]),true);
  const wire=await prepareMarrowlineAttachmentWire([item],{fetchImpl:viaMarrowline});
  assert.equal(toServer[0].action,'start');
  assert.deepEqual(toServer.slice(1).map(x=>x.action),['chunk','chunk']);
  assert.equal(upstream[0].offset,0);
  assert.equal(upstream[1].offset,2_250_000);
  assert.deepEqual(Buffer.concat(upstream.map(x=>x.bytes)),bytes,'payload reconstruction is byte exact');
  assert.equal(upstream[1].command,'upload, finalize');
  assert.equal(wire.length,1);
  assert.equal(wire[0].data_base64,undefined);
  assert.match(wire[0].upload_proof,/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(verifyMarrowlineUploadProof(wire[0]).file_uri,wire[0].file_uri);
  const normalized=normalizeMarrowlineAttachments(wire);
  const request=buildAttachmentGeminiRequest(
    {message:'Please review this document.',history:[],mode:'issued-conjunction'},
    {},'gemini-3.8-flash',normalized);
  const fileParts=request.contents.at(-1).parts.filter(part=>part.fileData);
  assert.equal(fileParts.length,1);
  assert.equal(fileParts[0].fileData.fileUri,wire[0].file_uri);
  assert.ok(!JSON.stringify(request).includes(item.data_base64.slice(0,80)),'large bytes must not re-enter the generation JSON');
  assert.throws(()=>normalizeMarrowlineAttachments([{...wire[0],name:'tampered.pdf'}]),/upload-proof/);
  assert.throws(()=>normalizeMarrowlineAttachments([{...wire[0],file_uri:'https://evil.example/files/no'}]),/upload-proof/);
});
