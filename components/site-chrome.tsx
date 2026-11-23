import Link from 'next/link';
import { society } from '@/lib/content';

const links = [
  ['About', '/about'], ['Committee', '/executive-committee'], ['Events', '/events'], ['Gallery', '/gallery'],
  ['Publications', '/publications'], ['Resources', '/resources'], ['Membership', '/membership'], ['Contact', '/contact'],
];
const groups=[
  {label:'About',items:[['The Society','/about'],['Executive Committee','/executive-committee'],['Gallery','/gallery']]},
  {label:'Learning & events',items:[['Events & conferences','/events'],['Publications','/publications'],['Learning resources','/resources']]},
  {label:'Membership',items:[['Membership information','/membership'],['Contact us','/contact']]},
];

export function SiteHeader() {
  return <><div className="utility"><div className="wrap utility-inner"><span>{society.tagline}</span><div><Link href="/contact">Contact us</Link><Link className="utility-join" href="/membership">Join the Society ↗</Link></div></div></div><header className="header"><div className="wrap header-inner"><Link className="brand" href="/" aria-label={`${society.name} home`}><img src={society.emblem} alt=""/><span><strong>Telangana</strong><small>Pharmacological Society</small></span></Link><nav className="desktop-nav" aria-label="Main navigation">{groups.map(group=><details className="nav-group" key={group.label}><summary>{group.label}<span aria-hidden="true">⌄</span></summary><div className="nav-dropdown">{group.items.map(([label,href])=><Link href={href} key={href}>{label}<span aria-hidden="true">→</span></Link>)}</div></details>)}</nav><Link className="header-cta" href="/membership">Become a member <span aria-hidden="true">→</span></Link><details className="mobile-nav"><summary aria-label="Open navigation">☰</summary><nav aria-label="Mobile navigation">{links.map(([label, href])=><Link href={href} key={href}>{label}</Link>)}</nav></details></div></header></>;
}

export function SiteFooter() {
  return <footer className="footer"><div className="wrap"><div className="footer-main"><div><Link className="brand brand-footer" href="/"><img src={society.emblem} alt=""/><span><strong>Telangana</strong><small>Pharmacological Society</small></span></Link><p>Advancing pharmacology, education<br/>and better health in Telangana.</p></div><div className="footer-links"><span>Explore</span>{links.slice(0,4).map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</div><div className="footer-links"><span>Information</span><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div><div className="footer-seal">TELANGANA<br/><b>PHARMACOLOGICAL</b><br/>SOCIETY ✳</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Telangana Pharmacological Society</span><span>{society.tagline}</span></div></div></footer>;
}
