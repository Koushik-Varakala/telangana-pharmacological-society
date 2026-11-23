import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function middleware(request:NextRequest){
  if(request.nextUrl.pathname==='/admin/login')return NextResponse.next({request});
  const response=NextResponse.next({request});
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!publicKey)return NextResponse.redirect(new URL('/admin/login?setup=required',request.url));
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.redirect(new URL('/admin/login',request.url));
  if(request.nextUrl.pathname!=='/admin/login'){
    const {data:profile}=await supabase.from('admin_profiles').select('role').eq('id',user.id).maybeSingle();
    if(!profile||profile.role!=='admin')return NextResponse.redirect(new URL('/admin/login?access=denied',request.url));
  }
  return response;
}
export const config={matcher:['/admin/:path*']};
