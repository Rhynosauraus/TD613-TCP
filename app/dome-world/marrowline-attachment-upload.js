/**
 * Provider Files API large attachment route, with <=2.25 MB binary per POST.
 * Client order is the confirmed numbered attachment tray order.
 * Raw bytes remain in live browser-memory for an explicit ↻; durable
 * conversation archives receive only receipt metadata.
 */
export const MARROWLINE_UPLOAD_ENDPOINT='/api/dome-world/khonapolit?operation=attachment-upload';
export const MARROWLINE_UPLOAD_INLINE_THRESHOLD=1_750_000;
export const MARROWLINE_UPLOAD_CHUNK_BASE64_CHARS=3_000_000;
export function marrowlineUploadRequired(items=[]) {
  return items.reduce((n,item)=>n+String(item?.data_base64||'').length,0)>MARROWLINE_UPLOAD_INLINE_THRESHOLD;
}
async function postUpload(fetchImpl,body,signal) {
  const result=await fetchImpl(MARROWLINE_UPLOAD_ENDPOINT,{
    method:'POST',signal,headers:{'content-type':'application/json',Accept:'application/json'},
    cache:'no-store',body:JSON.stringify(body)
  });
  const data=await result.json();
  if(!result.ok||data.ok!==true) throw new Error(data.error||'attachment-upload-held');
  return data;
}
export async function prepareMarrowlineAttachmentWire(items=[],{
  fetchImpl=fetch,signal,onProgress=()=>{}
}={}) {
  if(!marrowlineUploadRequired(items)) return items.map(x=>({...x}));
  const prepared=[];
  for(const [index,item] of items.entries()){
    if(signal?.aborted) throw new Error('operator-cancelled');
    const {data_base64,...metadata}=item;
    if(typeof data_base64!=='string'||!data_base64) throw new Error('reselect-original-attachment');
    const session=await postUpload(fetchImpl,{action:'start',...metadata},signal);
    const chunkSize=Math.min(MARROWLINE_UPLOAD_CHUNK_BASE64_CHARS,
      Math.floor(session.chunkBytes/3)*4);
    if(chunkSize<4||chunkSize%4) throw new Error('invalid-provider-upload-chunk-policy');
    let final=null;
    for(let cursor=0;cursor<data_base64.length;cursor+=chunkSize){
      if(signal?.aborted) throw new Error('operator-cancelled');
      const fragment=data_base64.slice(cursor,cursor+chunkSize);
      const offset=Math.floor(cursor/4)*3;
      final=await postUpload(fetchImpl,{
        action:'chunk',ticket:session.ticket,offset,
        data_base64:fragment,finalize:cursor+fragment.length>=data_base64.length
      },signal);
      onProgress({fileIndex:index+1,fileCount:items.length,bytesSent:Math.min(item.size_bytes,offset+Math.floor(fragment.length/4)*3)});
    }
    if(!final?.final||!final.file_uri||!final.upload_proof) throw new Error('provider-upload-incomplete');
    prepared.push({...metadata,file_uri:final.file_uri,upload_proof:final.upload_proof});
  }
  return prepared;
}
