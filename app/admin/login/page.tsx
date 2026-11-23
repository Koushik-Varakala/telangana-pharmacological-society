import Link from 'next/link';
import {PageIntro} from '@/components/page-intro';
import {hasSupabaseConfig} from '@/lib/supabase/server';
import {AdminLoginForm} from '@/components/admin-login-form';
export const metadata={title:'Admin login | Telangana Pharmacological Society'};
export default async function AdminLoginPage({searchParams}:{searchParams:Promise<{setup?:string;access?:string}>}){const params=await searchParams;return <><PageIntro eyebrow="Society administration" title="Administrator sign in" description="This area is restricted to authorised Society administrators."/><section className="section"><div className="wrap admin-login">{!hasSupabaseConfig()?<div className="review-note">Admin access is unavailable until Supabase is configured and an authorised administrator is created.</div>:<AdminLoginForm notice={params.access==='denied'?'This account is not authorised for Society administration.':undefined}/>}<Link className="text-link" href="/">Return to the public website →</Link></div></section></>}
