import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Telangana Pharmacological Society',
  description: 'Advancing pharmacology, education and better health in Telangana.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
