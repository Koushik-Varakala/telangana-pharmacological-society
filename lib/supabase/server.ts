import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

export function getSupabasePublicKey(){return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
export function hasSupabaseConfig(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&getSupabasePublicKey())}

export async function createSupabaseServerClient(){
  const jar=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,getSupabasePublicKey()!,{
    cookies:{getAll(){return jar.getAll()},setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options))}catch{}}},
  });
}
