export function publicFormsEnabled(){
  return process.env.NODE_ENV!=='production'||process.env.PUBLIC_FORMS_ENABLED==='true';
}

const requests=new Map<string,{count:number;resetAt:number}>();
export function allowRequest(key:string,limit=8,windowMs=60_000){
  const now=Date.now();
  for(const [entry,value] of requests)if(value.resetAt<=now)requests.delete(entry);
  const current=requests.get(key);
  if(!current||current.resetAt<=now){requests.set(key,{count:1,resetAt:now+windowMs});return true;}
  if(current.count>=limit)return false;
  current.count+=1;return true;
}
export function submissionGuard(request:Request,scope:string){
  if(!publicFormsEnabled())return {status:503,message:'Online forms are temporarily unavailable while the Society completes its privacy and operations review.'} as const;
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address=forwarded||request.headers.get('x-real-ip')||'unknown';
  if(!allowRequest(`${scope}:${address}`,5,60_000))return {status:429,message:'Too many submissions. Please wait a minute and try again.'} as const;
  return null;
}

export function isKnownTestEvent(event:{slug?:string|null;title?:string|null;venue?:string|null}){
  return event.slug==='test-event'&&event.title?.trim().toLowerCase()==='test event'&&event.venue?.trim().toLowerCase()==='hyderabd test';
}

export function isPastEvent(event:{starts_at?:string|null;ends_at?:string|null},now=Date.now()){
  const end=event.ends_at||event.starts_at;
  return Boolean(end&&new Date(end).getTime()<now);
}
